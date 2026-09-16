import React, { createContext, useState, useContext } from 'react';

const TabBarContext = createContext({
  isTabBarHidden: false,
  setIsTabBarHidden: () => {},
});

export function TabBarProvider({ children }) {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  return (
    <TabBarContext.Provider value={{ isTabBarHidden, setIsTabBarHidden }}>
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  return useContext(TabBarContext);
}
