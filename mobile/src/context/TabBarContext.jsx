import React, { createContext, useState, useContext, useCallback, useRef } from 'react';

export const TAB_ROUTES = ['/home', '/interpreter', '/chat', '/modules', '/profile'];
export const TAB_SCREEN_NAMES = ['home', 'interpreter', 'chat', 'modules', 'profile'];

const TabBarContext = createContext({
  isTabBarHidden: false,
  setIsTabBarHidden: () => {},
  unreadChatCount: 0,
  setUnreadChatCount: () => {},
  tabAnimation: 'slide_from_right',
  setTabAnimation: () => {},
  tabDirection: 'right',
  setTabDirection: () => {},
  navigateTab: () => {},
});

export function TabBarProvider({ children }) {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [tabAnimation, setTabAnimation] = useState('slide_from_right');
  const [tabDirection, setTabDirection] = useState('right');
  const prevTabRouteRef = useRef('/home');

  const navigateTab = useCallback((targetRoute, router, currentRoute) => {
    if (!targetRoute || targetRoute === currentRoute) return;

    const fromIndex = TAB_ROUTES.indexOf(currentRoute || prevTabRouteRef.current);
    const toIndex = TAB_ROUTES.indexOf(targetRoute);

    let nextAnim = 'slide_from_right';
    let nextDir = 'right';

    if (fromIndex !== -1 && toIndex !== -1) {
      if (toIndex < fromIndex) {
        nextAnim = 'slide_from_left';
        nextDir = 'left';
      } else {
        nextAnim = 'slide_from_right';
        nextDir = 'right';
      }
    }

    setTabAnimation(nextAnim);
    setTabDirection(nextDir);
    prevTabRouteRef.current = targetRoute;

    router.push(targetRoute);
  }, []);

  return (
    <TabBarContext.Provider 
      value={{ 
        isTabBarHidden, 
        setIsTabBarHidden, 
        unreadChatCount, 
        setUnreadChatCount,
        tabAnimation,
        setTabAnimation,
        tabDirection,
        setTabDirection,
        navigateTab
      }}
    >
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  return useContext(TabBarContext);
}

