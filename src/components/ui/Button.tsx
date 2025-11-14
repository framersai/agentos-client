import React from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'xs';

type ButtonProps = React.PropsWithChildren<{
	className?: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	type?: 'button' | 'submit' | 'reset';
	disabled?: boolean;
}>;

const variantClasses: Record<ButtonVariant, string> = {
	primary: 'theme-bg-accent theme-text-on-accent shadow-lg shadow-[color:rgba(0,0,0,0.1)] hover:opacity-95',
	secondary: 'border theme-border theme-bg-secondary theme-text-primary hover:opacity-95',
	outline: 'border theme-border bg-transparent theme-text-primary hover:bg-[color:var(--color-background-secondary)]/60',
	success: 'theme-bg-success theme-text-on-accent hover:opacity-95',
	warning: 'theme-bg-warning theme-text-on-accent hover:opacity-95',
};

const sizeClasses: Record<ButtonSize, string> = {
	xs: 'px-2 py-1 text-xs',
	sm: 'px-3 py-1.5 text-sm',
	md: 'px-4 py-2 text-sm',
};

export function Button({ className, variant = 'secondary', size = 'md', type = 'button', ...rest }: ButtonProps) {
	const base =
		'inline-flex items-center justify-center rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
	return (
		<button
			type={type}
			className={clsx(base, variantClasses[variant], sizeClasses[size], className)}
			{...rest}
		/>
	);
}


