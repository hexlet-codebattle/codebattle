import React from 'react';
import './ContextMenu.css';

function ContextMenu({
	x,
	y,
	id,
	onResize,
	onDelete,
	onAddBlock,
	showAddMenu,
	setShowAddMenu,
	blocks,
}) {
	const handleAddClick = e => {
		e.stopPropagation();
		setShowAddMenu(prev => !prev);
	};

	const handleAddType = type => {
		const found = items.find(item => item.type === type);
		if (found) onAddBlock(found.mapId);
	};
	const blockExists = blockId => blocks.some(b => b.id === blockId);

	const items = [
		{ label: '🧠 code-1', type: 'code-1', mapId: 'code-1' },
		{ label: '💻 code-2', type: 'code-2', mapId: 'code-2' },
		{ label: '⏱️ timer', type: 'timer', mapId: 'timer-1' },
		{ label: '📋 Задача', type: 'text-1', mapId: 'text-1' },
		{ label: '💬 Чат', type: 'text-3', mapId: 'text-3' },
		{ label: '✅ Tests', type: 'text-2', mapId: 'text-2' },
		{ label: '✅ Tests 2', type: 'text-4', mapId: 'text-4' },
	];

	return (
  <div
    className="context-menu"
    style={{
				position: 'absolute',
				top: y,
				left: x,
				background: '#fff',
				border: '1px solid #ccc',
				borderRadius: '8px',
				padding: '8px',
				boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
				zIndex: 9999,
				minWidth: '160px',
			}}
    onClick={e => e.stopPropagation()}
		>
    <button
      className="context-button"
      onClick={e => {
					e.stopPropagation();
					onResize();
				}}
    >
      ✏️ Изменить размер
    </button>

    <button
      className="context-button delete"
      onClick={e => {
					e.stopPropagation();
					onDelete();
				}}
    >
      🗑️ Удалить блок
    </button>
    <div style={{ position: 'relative' }}>
      <button className="context-button" onClick={handleAddClick}>
        ➕ Добавить блок
      </button>

      {showAddMenu && (
      <div className="submenu" onClick={e => e.stopPropagation()}>
        {items.map(({ label, type, mapId }) => {
							const disabled = blockExists(mapId);
							return (
  <button
    key={type}
    className="context-button"
    onClick={e => {
										e.stopPropagation();
										if (!disabled) {
											handleAddType(type);
										}
									}}
    disabled={disabled}
    title={disabled ? 'Этот блок уже добавлен' : ''}
  >
    {label}
  </button>
							);
						})}
      </div>
				)}
    </div>
  </div>
	);
}

export default ContextMenu;
