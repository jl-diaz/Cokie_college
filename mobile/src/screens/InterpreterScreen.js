import { Platform } from 'react-native';

const InterpreterScreen = Platform.OS === 'web'
  ? require('./InterpreterScreen.web').default
  : require('./InterpreterScreen.native').default;

export default InterpreterScreen;
