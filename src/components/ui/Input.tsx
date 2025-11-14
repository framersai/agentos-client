import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	icon?: React.ReactNode;
};

export function Input({ className, icon, ...rest }: InputProps) {
	return (
		<div className="relative text-sm">
			{icon ? (
				<div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 theme-text-muted">{icon}</div>
			) : null}
			<input
				className={`w-full rounded-lg border theme-border bg-[color:var(--color-background-secondary)] px-3 py-2 text-sm theme-text-primary placeholder:text-[color:var(--color-text-muted)] focus:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background-primary)] transition-colors ${icon ? 'pl-8' : ''} ${className ?? ''}`}
				{...rest}
			/>
		</div>
	);
}


