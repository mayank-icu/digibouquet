import React from 'react';
import { View } from 'react-native';

export const PARTICLE_CONFIGS: Record<string, { size: number; color: string; shape: 'circle' | 'square' | 'star' | 'heart'; blur?: boolean }[]> = {
  'cherry-blossom': [{ size: 15, color: '#ffb7c5', shape: 'circle' }],
  snow:             [{ size: 8,  color: '#ffffff', shape: 'circle', blur: true }],
  confetti: [
    { size: 10, color: '#f1c40f', shape: 'square' },
    { size: 10, color: '#e67e22', shape: 'square' },
    { size: 10, color: '#2ecc71', shape: 'square' },
    { size: 10, color: '#3498db', shape: 'square' },
    { size: 10, color: '#9b59b6', shape: 'square' },
    { size: 10, color: '#e74c3c', shape: 'square' },
  ],
  sparkles: [{ size: 8, color: '#f1c40f', shape: 'star' }],
  hearts:   [{ size: 12, color: '#e74c3c', shape: 'heart' }],
};

export function ParticleShape({ config }: { config: typeof PARTICLE_CONFIGS[string][0] }) {
  const { size, color, shape, blur } = config;
  if (shape === 'circle') {
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        opacity: blur ? 0.85 : 0.8,
        ...(blur ? { shadowColor: color, shadowOpacity: 0.6, shadowRadius: 3 } : {}),
      }} />
    );
  }
  if (shape === 'square') {
    return (
      <View style={{
        width: size, height: size,
        backgroundColor: color,
        transform: [{ rotate: '45deg' }],
      }} />
    );
  }
  if (shape === 'star') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: size, height: size, backgroundColor: color }} />
        <View style={{ position: 'absolute', width: size, height: size, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
      </View>
    );
  }
  if (shape === 'heart') {
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', width: size, height: size, backgroundColor: color, transform: [{ rotate: '-45deg' }], top: size * 0.2, left: 0 }} />
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, top: -size * 0.3, left: 0 }} />
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, top: 0, left: size * 0.5 }} />
      </View>
    );
  }
  return null;
}
