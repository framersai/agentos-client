import React, { createContext, useContext, useMemo, useState } from 'react';

type TabsContextValue = {
	active: string;
	setActive: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = React.PropsWithChildren<{
	defaultValue: string;
	className?: string;
}>;

export function Tabs({ defaultValue, className, children }: TabsProps) {
	const [active, setActive] = useState(defaultValue);
	const ctx = useMemo(() => ({ active, setActive }), [active]);
	return (
		<div className={className}>
			<TabsContext.Provider value={ctx}>{children}</TabsContext.Provider>
		</div>
	);
}

export function TabsList({ children }: React.PropsWithChildren) {
	return <div className="flex gap-2">{children}</div>;
}

type TabsTriggerProps = React.PropsWithChildren<{ value: string }>;
export function TabsTrigger({ value, children }: TabsTriggerProps) {
	const ctx = useContext(TabsContext);
	if (!ctx) return null;
	const active = ctx.active === value;
	return (
		<button
			type="button"
			className={`rounded-full px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
				active
					? 'theme-bg-accent theme-text-on-accent shadow-sm'
					: 'border theme-border theme-bg-secondary theme-text-secondary hover:opacity-95 transition'
			}`}
			onClick={() => ctx.setActive(value)}
			aria-pressed={active}
		>
			{children}
		</button>
	);
}

type TabsContentProps = React.PropsWithChildren<{ value: string; className?: string }>;
export function TabsContent({ value, className, children }: TabsContentProps) {
	const ctx = useContext(TabsContext);
	if (!ctx) return null;
	if (ctx.active !== value) return null;
	return <div className={className}>{children}</div>;
}


