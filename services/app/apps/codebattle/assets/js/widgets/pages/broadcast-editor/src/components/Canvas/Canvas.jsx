// src/components/Canvas/Canvas.jsx

import React, { useEffect, useState } from 'react';

import { Rnd } from 'react-rnd';

import BlockCode from '../BlockCode/BlockCode';
import BlockText from '../BlockText/BlockText';
import BlockTimer from '../BlockTimer/BlockTimer';
import ContextMenu from '../ContextMenu/ContextMenu';
import Toast from '../Toast/Toast';
import './Canvas.css';

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
    text: 'Задача\nРеализуйте функцию, которая принимает на вход два числа и возвращает их сумму. Убедитесь, что оба аргумента являются целыми числами.',
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

function Canvas({
  initialBlocks = [],
  onBlocksChange = () => {},
  readOnly = false,
}) {
  const [blocks, setBlocks] = useState(() => (initialBlocks.length ? [...initialBlocks] : defaultBlocks));

  useEffect(() => {
    setBlocks(initialBlocks.length ? [...initialBlocks] : defaultBlocks);
  }, [initialBlocks]);

  const [contextMenu, setContextMenu] = useState(null);
  const [resizingBlock, setResizingBlock] = useState(null);
  const [toast, setToast] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const snap = value => {
    const grid = 32;
    const threshold = 6;
    const mod = value % grid;
    if (mod < threshold) return value - mod;
    if (mod > grid - threshold) return value + (grid - mod);
    return value;
  };

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.altKey) setSnapEnabled(false);
    };
    const handleKeyUp = () => setSnapEnabled(true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const updateBlock = (id, changes) => {
    if (readOnly) return;
    const updated = blocks.map(block => (block.id === id ? { ...block, ...changes } : block));
    setBlocks(updated);
    onBlocksChange(updated);
  };

  const handleContextMenu = (e, id) => {
    if (readOnly) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
    setShowAddMenu(false);
  };

  const handleDelete = id => {
    if (readOnly) return;
    const newBlocks = blocks.filter(block => block.id !== id);
    setBlocks(newBlocks);
    setToast('🗑 Блок удалён');
    onBlocksChange(newBlocks);
    closeContextMenu();
  };

  const handleAddBlock = id => {
    if (readOnly) return;
    const hasBlock = blockId => blocks.some(b => b.id === blockId);
    const templates = Object.fromEntries(defaultBlocks.map(b => [b.id, b]));
    if (templates[id] && !hasBlock(id)) {
      const newBlocks = [...blocks, templates[id]];
      setBlocks(newBlocks);
      setToast('✅ Блок добавлен');
      onBlocksChange(newBlocks);
    } else {
      setToast('⚠️ Блок уже существует');
    }
    closeContextMenu();
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setShowAddMenu(false);
  };

  return (
    <div
      className="canvas"
      onClick={e => {
        if (!e.target.closest('.context-menu')) closeContextMenu();
      }}
    >
      {blocks.map(block => {
        const common = {
          id: block.id,
          x: block.x,
          y: block.y,
          position: { x: block.x, y: block.y },
          width: block.width,
          height: block.height,
          onContextMenu: e => handleContextMenu(e, block.id),
          onMove: (x, y) => updateBlock(block.id, {
              x: snapEnabled ? snap(x) : x,
              y: snapEnabled ? snap(y) : y,
            }),
          onDrag: (x, y) => updateBlock(block.id, {
              x: snapEnabled ? snap(x) : x,
              y: snapEnabled ? snap(y) : y,
            }),
          onResize: (w, h) => updateBlock(block.id, {
              width: snapEnabled ? snap(w) : w,
              height: snapEnabled ? snap(h) : h,
            }),
          isResizable: !readOnly && resizingBlock === block.id,
          onStopResize: () => {
            if (!readOnly) {
              onBlocksChange([...blocks]);
              setResizingBlock(null);
            }
          },
          onStopDrag: () => {
            if (!readOnly) onBlocksChange([...blocks]);
          },
        };

        if (block.type === 'code') {
          return (
            <BlockCode
              key={block.id}
              {...common}
              nick={block.nick}
              color={block.color}
              code={block.code || ''}
              theme={block.theme || 'vscDarkPlus'}
              onThemeChange={newTheme => updateBlock(block.id, { theme: newTheme })}
            />
          );
        }
        if (block.type === 'text') {
          return <BlockText key={block.id} {...common} text={block.text} />;
        }
        if (block.type === 'timer') {
          return <BlockTimer key={block.id} {...common} time={block.time} />;
        }
        return null;
      })}

      {!readOnly && contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          id={contextMenu.id}
          onResize={() => {
            setResizingBlock(contextMenu.id);
            closeContextMenu();
          }}
          onDelete={() => handleDelete(contextMenu.id)}
          onAddBlock={handleAddBlock}
          showAddMenu={showAddMenu}
          setShowAddMenu={setShowAddMenu}
          blocks={blocks}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Canvas;
