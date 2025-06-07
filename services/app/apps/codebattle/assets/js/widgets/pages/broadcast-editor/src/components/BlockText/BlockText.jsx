import React from 'react'
import BlockBase from '../BlockBase/BlockBase'
import './BlockText.css'

function BlockText({ text, ...props }) {
	const lines = text.split('\n')
	const isChat = text.trim().startsWith('Чат')
	const isTask = text.trim().startsWith('Задача')

	return (
		<BlockBase {...props}>
			<div className="block-text">
				<div
					style={{
						fontWeight: 600,
						fontSize: '16px',
						marginBottom: 8,
						display: 'block',
					}}
				>
					{lines[0]}
				</div>

				{(isChat || isTask) && (
					<div
						style={{
							marginBottom: 8,
							height: '1px',
							width: '100%',
							backgroundColor: '#ddd',
						}}
					/>
				)}

				
				{lines.slice(1).map((line, i) => {
					const trimmed = line.trim().toLowerCase()

					if (trimmed === 'failed') {
						return (
							<div key={i} style={{ color: '#e53935', fontWeight: 500 }}>
								{line}
							</div>
						)
					}

					const passed = /(\d+)\s*\/\s*(\d+)\s*passed/i.exec(line)
					if (passed && passed[1] === passed[2]) {
						return (
							<div key={i} style={{ color: '#22c55e', fontWeight: 500 }}>
								{line}
							</div>
						)
					}

					return (
						<div key={i} style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
							{line}
						</div>
					)
				})}
			</div>
		</BlockBase>
	)
}

export default BlockText
