import React, { createContext, useState, useContext } from 'react';

const TabBarContext = createContext({
  isTabBarHidden: false,
  setIsTabBarHidden: () => {},
  unreadChatCount: 0,
  setUnreadChatCount: () => {},
});

export function TabBarProvider({ children }) {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  return (
    <TabBarContext.Provider value={{ isTabBarHidden, setIsTabBarHidden, unreadChatCount, setUnreadChatCount }}>
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  return useContext(TabBarContext);
}
