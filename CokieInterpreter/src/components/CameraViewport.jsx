import React from 'react';
import { Platform } from 'react-native';
import CameraViewportWeb from './CameraViewport.web';
import CameraViewportNative from './CameraViewport.native';

export default function CameraViewport(props) {
  if (Platform.OS === 'web') {
    return <CameraViewportWeb {...props} />;
  }
  return <CameraViewportNative {...props} />;
}
