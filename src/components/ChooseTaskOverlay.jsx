import { useState } from 'react';
import { T } from '../tokens.js';
import { RootFolderScreen } from './RootFolderScreen.jsx';
import { MissionInput } from './MissionInput.jsx';

// Bottom-sheet modal that hosts the existing RootFolderScreen and
// MissionInput (checklist) in selectionMode. Picking a checklist item
// fires `onSelect` and dismisses; no app navigation happens.
//
// We deliberately reuse the existing components rather than building
// a parallel picker so any queue / folder edits are honored. The
// `selectionMode` prop on MissionInput swaps the launch icon for a
// checkmark and routes the per-item action through `onSelect`.
export function ChooseTaskOverlay({ folders, onSelect, onClose }) {
  const [openFolderId, setOpenFolderId] = useState(null);
  const foldersById = Object.fromEntries(folders.map(f => [f.id, f]));
  const folder = openFolderId ? foldersById[openFolderId] : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(2,4,10,0.62)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: 'backdropIn 220ms ease-out both',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        paddingTop: 'max(40px, env(safe-area-inset-top))',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          background: T.bg,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          border: `1px solid ${T.hairline}`,
          borderBottom: 'none',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          animation: 'sheetIn 320ms cubic-bezier(0.2,0.8,0.2,1) both',
        }}
      >
        {/* drag handle + close */}
        <div style={{
          flexShrink: 0, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 0 4px',
        }}>
          <div style={{
            width: 44, height: 4, borderRadius: 99,
            background: 'rgba(255,255,255,0.18)',
          }} />
          <button
            onClick={onClose}
            aria-label="Close task picker"
            style={{
              all: 'unset', cursor: 'pointer',
              position: 'absolute', top: 6, right: 14,
              width: 32, height: 32, borderRadius: 99,
              background: T.surface, border: `1px solid ${T.hairlineSoft}`,
              color: T.text2,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        }}>
          {!openFolderId ? (
            <RootFolderScreen
              folders={folders}
              onOpen={(id) => setOpenFolderId(id)}
            />
          ) : (
            <MissionInput
              folderId={openFolderId}
              folder={folder}
              onBack={() => setOpenFolderId(null)}
              mission=""
              setMission={() => {}}
              onLaunch={() => {}}
              selectionMode
              onSelect={(task) => onSelect({ ...task, folderId: openFolderId })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
