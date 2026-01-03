import React, { useEffect, useState } from 'react';

import Canvas from './components/Canvas/Canvas';
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
    text: 'Task description',
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
    text: 'Chat\n😮‍💨 Pavel: oi\n💀 Matvey: blz.',
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
      window.alert("Can't delete default preset");
      return;
    }

    const updated = { ...presets };
    delete updated[currentPreset];
    updated.current = 'default';

    setPresets(updated);
    setCurrentPreset('default');
    localStorage.setItem('presets', JSON.stringify(updated));
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

  return (
    <>
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
            🗑 Удалить
          </button>
        )}

        {showSaveField && (
          <>
            <input
              type="text"
              className="preset-input"
              placeholder="Preset name"
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
            initialBlocks={presets[currentPreset] || []}
            onBlocksChange={() => {}}
            readOnly
          />
        </div>
      )}
    </>
  );
}
