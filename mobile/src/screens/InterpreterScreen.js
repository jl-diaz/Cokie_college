import { Platform } from 'react-native';
import InterpreterScreenNative from './InterpreterScreen.native';
import InterpreterScreenWeb from './InterpreterScreen.web';

const InterpreterScreen = Platform.OS === 'web' ? InterpreterScreenWeb : InterpreterScreenNative;

export default InterpreterScreen;
