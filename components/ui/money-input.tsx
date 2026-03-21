'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: number | string;
    onChange?: (value: number) => void;
    currency?: string;
    locale?: string;
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ className, value = '', onChange, currency = 'VNĐ', locale = 'vi-VN', ...props }, ref) => {
        const [displayValue, setDisplayValue] = React.useState('');

        // Format number to display with thousand separators
        const formatNumber = (num: number | string): string => {
            if (num === '' || num === null || num === undefined) return '';
            const number = typeof num === 'string' ? parseFloat(num) : num;
            if (isNaN(number)) return '';
            return new Intl.NumberFormat(locale).format(number);
        };

        // Parse display value to number
        const parseDisplayValue = (display: string): number => {
            if (!display) return 0;
            // Remove all non-digit characters except decimal point
            const cleaned = display.replace(/[^\d]/g, '');
            return cleaned ? parseInt(cleaned, 10) : 0;
        };

        // Update display value when prop value changes
        React.useEffect(() => {
            if (value !== undefined && value !== null) {
                setDisplayValue(formatNumber(value));
            }
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;
            
            // Allow empty input
            if (inputValue === '') {
                setDisplayValue('');
                onChange?.(0);
                return;
            }

            // Parse the number from input
            const numericValue = parseDisplayValue(inputValue);
            
            // Format and update display
            const formatted = formatNumber(numericValue);
            setDisplayValue(formatted);
            
            // Call onChange with numeric value
            onChange?.(numericValue);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            // Re-format on blur to ensure consistency
            if (displayValue) {
                const numericValue = parseDisplayValue(displayValue);
                setDisplayValue(formatNumber(numericValue));
            }
            props.onBlur?.(e);
        };

        return (
            <div className="relative">
                <Input
                    ref={ref}
                    type="text"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={cn('pr-12', className)}
                    {...props}
                />
                {currency && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {currency}
                    </div>
                )}
            </div>
        );
    }
);

MoneyInput.displayName = 'MoneyInput';

export { MoneyInput };
