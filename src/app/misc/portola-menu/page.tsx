'use client';

import React, { useState, useEffect } from 'react';

// Simple UI components defined inline with proper typing
const Card = ({ className = '', children, ...props }: { className?: string, children: React.ReactNode, [key: string]: any }) => (
  <div className={`rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 ${className}`} {...props}>
    {children}
  </div>
);

const Skeleton = ({ className = '', ...props }: { className?: string, [key: string]: any }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`} {...props} />
);

// Simple tabs implementation with proper typing
const Tabs = ({ defaultValue, onValueChange, children }: { defaultValue: string, onValueChange?: (value: string) => void, children: React.ReactNode }) => {
  const [value, setValue] = useState(defaultValue);
  
  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onValueChange?.(newValue);
  };
  
  return (
    <div className="tabs-container" data-value={value}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && 
           (child.type === TabsList || child.type === TabsTrigger)) {
          return React.cloneElement(child, { value, onValueChange: handleValueChange } as any);
        }
        return child;
      })}
    </div>
  );
};

const TabsList = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 dark:bg-gray-800">
    {children}
  </div>
);

const TabsTrigger = ({ value, children, ...props }: { value: string, children: React.ReactNode, [key: string]: any }) => {
  const isActive = props.value === value;
  
  return (
    <button
      type="button"
      data-state={isActive ? 'active' : 'inactive'}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all
        ${isActive ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-950 dark:text-gray-50' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50'}`}
      onClick={() => props.onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
};

// No need for TabsContent since it's not being used

// Custom useInterval hook with proper typing
function useInterval(callback: () => void, delay: number) {
  const savedCallback = useState(() => callback)[0];
  
  useEffect(() => {
    function tick() {
      savedCallback();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay, savedCallback]);
}

interface MenuItem {
  text: string;
  highlight?: boolean;
  class?: string;
}

interface MenuData {
  days: {
    title: string;
    items: MenuItem[];
  }[];
  dateRange: string;
}

export default function PortolaMenuPage() {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mealType, setMealType] = useState('dinner');

  const fetchMenu = async (meal: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/portola-menu?meal=${meal}`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu data');
      }
      const data = await response.json();
      setMenuData(data);
      setError(null);
    } catch (err) {
      setError('Error loading menu data. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMenu(mealType);
  }, [mealType]);

  // Refresh every minute
  useInterval(() => {
    fetchMenu(mealType);
  }, 60000);

  const handleMealChange = (value: string) => {
    setMealType(value);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Portola Dining Menu</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {menuData ? `Portola Dining ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Menu` : 'Portola Dining Menu'}
          {menuData && <span className="text-sm font-normal ml-2">from {menuData.dateRange}</span>}
        </h1>
        
        <Tabs defaultValue={mealType} onValueChange={handleMealChange}>
          <TabsList>
            <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
            <TabsTrigger value="lunch">Lunch/Brunch</TabsTrigger>
            <TabsTrigger value="dinner">Dinner</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <div className="p-6 pb-2">
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="p-6 pt-2">
                {[...Array(8)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full my-2" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : menuData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {menuData.days.map((day, index) => (
            <Card key={index}>
              <div className="p-6 pb-2">
                <h3 className="text-lg font-semibold">{day.title}</h3>
              </div>
              <div className="p-6 pt-2">
                <ul className="space-y-1">
                  {day.items.map((item, itemIndex) => {
                    if (item.class === 'course-row') {
                      return (
                        <li key={itemIndex} className="text-lg font-medium mt-2">
                          {item.text}
                        </li>
                      );
                    } else if (item.highlight) {
                      return (
                        <li key={itemIndex} className="font-bold text-red-600">
                          {item.text}
                        </li>
                      );
                    } else {
                      return <li key={itemIndex}>{item.text}</li>;
                    }
                  })}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8">
          <p className="text-xl text-red-500">No menu available for this week</p>
        </div>
      )}
    </div>
  );
}