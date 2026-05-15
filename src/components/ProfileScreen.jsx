import { T } from '../tokens.js';

export function ProfileScreen() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.display,
      fontSize: 24,
      fontWeight: 600,
      color: T.text,
      letterSpacing: '0.02em',
    }}>
      Profile
    </div>
  );
}
