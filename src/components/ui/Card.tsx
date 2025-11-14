import React from 'react';

type CardProps = React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>> & {
	className?: string;
};

export function Card({ className, children, ...rest }: CardProps) {
	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 ${className ?? ''}`}
			{...rest}
		>
			{children}
		</div>
	);
}


