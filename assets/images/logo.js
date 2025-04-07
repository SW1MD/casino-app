import React from 'react';
import { SvgXml } from 'react-native-svg';

const logoSvg = `
<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" rx="20" fill="#1E1E2E"/>
  <path d="M43.5 35C39.9101 35 37 37.9101 37 41.5V81C37 84.5899 39.9101 87.5 43.5 87.5H83C86.5899 87.5 89.5 84.5899 89.5 81V41.5C89.5 37.9101 86.5899 35 83 35H43.5Z" fill="#FFD700" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="47" cy="45" r="6" fill="#E91E63"/>
  <circle cx="60" cy="45" r="6" fill="#9C27B0"/>
  <circle cx="73" cy="45" r="6" fill="#3F51B5"/>
  <circle cx="47" cy="59" r="6" fill="#2196F3"/>
  <circle cx="60" cy="59" r="6" fill="#00BCD4"/>
  <circle cx="73" cy="59" r="6" fill="#4CAF50"/>
  <circle cx="47" cy="73" r="6" fill="#FFEB3B"/>
  <circle cx="60" cy="73" r="6" fill="#FF9800"/>
  <circle cx="73" cy="73" r="6" fill="#F44336"/>
  <path d="M30 32L23 25L22 50L30 32Z" fill="#FFD700"/>
  <path d="M90 32L97 25L98 50L90 32Z" fill="#FFD700"/>
  <path d="M60 23L67 17V30L60 23Z" fill="#FFD700"/>
  <path d="M60 97L67 103V90L60 97Z" fill="#FFD700"/>
  <path d="M21 62L17 55H30L21 62Z" fill="#FFD700"/>
  <path d="M99 62L103 55H90L99 62Z" fill="#FFD700"/>
</svg>
`;

export const CasinoLogo = () => <SvgXml xml={logoSvg} width="100%" height="100%" />;

export default CasinoLogo; 