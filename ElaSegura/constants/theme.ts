export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#F7D2F1',
    cardBackground: '#FFFFFF',
    primary: '#F35F74',
    secondary: '#9C97AC',
    accent: '#FFF0F2',
    border: '#F0F0F0',
    tabIconDefault: '#9C97AC',
    tabIconSelected: '#F35F74',
    statusBar: 'dark-content',
    headerBg: '#FFFFFF',
    icon: '#9C97AC',
  },
  dark: {
    text: '#FFFFFF',
    background: '#121212',
    cardBackground: '#1E1E1E',
    primary: '#F35F74',
    secondary: '#A0A0A0',
    accent: '#2D2D2D',
    border: '#333333',
    tabIconDefault: '#A0A0A0',
    tabIconSelected: '#F35F74',
    statusBar: 'light-content',
    headerBg: '#1E1E1E',
    icon: '#A0A0A0',
  },
};

export type ThemeColors = typeof Colors.light;
