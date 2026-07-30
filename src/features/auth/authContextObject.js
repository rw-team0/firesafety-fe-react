import { createContext } from 'react'

// Context만 분리 (Provider와 같은 파일에 두면 react-refresh 규칙 위반)
export const AuthContext = createContext(null)
