import React, { useEffect, useState } from 'react';

import Canvas from './components/Canvas/Canvas';
import Header from './components/Header/Header';
import './index.css';
import './App.css';

const defaultBlocks = [
  {
    id: 'code-1',
    type: 'code',
    nick: 'Pavel',
    color: 'red',
    x: 32,
    y: 32,
    width: 320,
    height: 256,
    code: 'const x = 42;\nconsole.log(x);',
    theme: 'vscDarkPlus',
  },
  {
    id: 'code-2',
    type: 'code',
    nick: 'Matvey',
    color: '#4ade80',
    x: 32,
    y: 320,
    width: 320,
    height: 240,
    code: 'const b = 27;\nconst c = 22;\nconst res = b + c;\nconsole.log(res);',
    theme: 'vscDarkPlus',
  },
  {
    id: 'text-1',
    type: 'text',
    text: 'Задача\nОписание задачки тестовое, чтобы показать как выглядит блок с текстом.',
    x: 384,
    y: 32,
    width: 256,
    height: 256,
  },
  {
    id: 'timer-1',
    type: 'timer',
    time: '00:29:37',
    x: 672,
    y: 32,
    width: 256,
    height: 64,
  },
  {
    id: 'text-3',
    type: 'text',
    text: 'Чат\n😮‍💨 Pavel: текст заглушка для примера\n💀 Matvey: ок.',
    x: 672,
    y: 128,
    width: 256,
    height: 200,
  },
  {
    id: 'text-2',
    type: 'text',
    text: 'Tests\n4 / 5 Passed\nFailed',
    x: 384,
    y: 320,
    width: 256,
    height: 96,
  },
  {
    id: 'text-4',
    type: 'text',
    text: 'Tests 2\n5 / 5 Passed\nTrue',
    x: 384,
    y: 448,
    width: 256,
    height: 96,
  },
];

export default function App() {
  const [presets, setPresets] = useState({});
  const [currentPreset, setCurrentPreset] = useState('default');
  const [showSaveField, setShowSaveField] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('presets') || '{}');

    if (!stored.default) {
      stored.default = defaultBlocks;
    }

    if (!stored.current || !stored[stored.current]) {
      stored.current = 'default';
    }

    localStorage.setItem('presets', JSON.stringify(stored));
    setPresets(stored);
    setCurrentPreset(stored.current);
    setTimeout(() => setIsLoaded(true), 60);
  }, []);

  const handlePresetChange = (e) => {
    const name = e.target.value;
    const updated = { ...presets, current: name };
    setPresets(updated);
    setCurrentPreset(name);
    localStorage.setItem('presets', JSON.stringify(updated));
  };

  const handleDeletePreset = () => {
    if (currentPreset === 'default') {
      // eslint-disable-next-line
      alert("Can't delete default preset");
      return;
    }

    const updated = { ...presets };
    delete updated[currentPreset];
    updated.current = 'default';

    setPresets(updated);
    setCurrentPreset('default');
    setCanvasKey((prev) => prev + 1);
    localStorage.setItem('presets', JSON.stringify(updated));
  };

  const handleSaveClick = () => {
    setShowSaveField(true);
    setSaveName('');
  };

  const handleSaveConfirm = () => {
    if (!saveName.trim()) return;
    const updated = {
      ...presets,
      [saveName]: presets[currentPreset] || [],
      current: saveName,
    };
    setPresets(updated);
    setCurrentPreset(saveName);
    localStorage.setItem('presets', JSON.stringify(updated));
    setShowSaveField(false);
    setSaveName('');
  };

  const handleBlocksChange = (newBlocks) => {
    if (currentPreset === 'default') return;
    const updated = {
      ...presets,
      [currentPreset]: newBlocks,
      current: currentPreset,
    };
    setPresets(updated);
    localStorage.setItem('presets', JSON.stringify(updated));
  };

  return (
    <>
      <Header onSave={handleSaveClick} />

      <div className="preset-bar">
        <select
          className="preset-select"
          value={currentPreset}
          onChange={handlePresetChange}
        >
          {Object.keys(presets)
            .filter((k) => k !== 'current')
            .map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
        </select>

        {currentPreset !== 'default' && (
          <button
            type="button"
            className="preset-delete-button"
            onClick={handleDeletePreset}
          >
            🗑 Delete
          </button>
        )}

        {showSaveField && (
          <>
            <input
              type="text"
              className="preset-input"
              placeholder="Название пресета"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveConfirm()}
            />
            <button
              type="button"
              className="preset-save-button"
              onClick={handleSaveConfirm}
            >
              💾 Save
            </button>
          </>
        )}
      </div>

      {isLoaded && (
        <div className="fade-in">
          <Canvas
            key={canvasKey}
            initialBlocks={presets[currentPreset] || []}
            onBlocksChange={handleBlocksChange}
          />
        </div>
      )}
    </>
  );
}
