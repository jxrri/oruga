import type { ComponentProps, ElementType } from 'react';
import { DropdownMenu as RMenu } from 'radix-ui';
import { CheckIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';

export const DropdownMenu = RMenu.Root;
export const DropdownMenuTrigger = RMenu.Trigger;
export const DropdownMenuGroup = RMenu.Group;
export const DropdownMenuRadioGroup = RMenu.RadioGroup;

export function DropdownMenuContent({ className, sideOffset = 6, align = 'end', ...props }: ComponentProps<typeof RMenu.Content>) {
  return (
    <RMenu.Portal>
      <RMenu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-[55] min-w-48 overflow-hidden rounded-xl border border-line bg-raised p-1 text-sm text-ink shadow-flotante',
          'data-[state=open]:animate-flotante-entra',
          className,
        )}
        {...props}
      />
    </RMenu.Portal>
  );
}

const claseItem =
  'relative flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-panel-2 [&_svg]:shrink-0';

export function DropdownMenuItem({
  className,
  icono: Icono,
  tono,
  children,
  ...props
}: ComponentProps<typeof RMenu.Item> & { icono?: ElementType; tono?: 'peligro' }) {
  return (
    <RMenu.Item className={cn(claseItem, tono === 'peligro' && 'text-danger', className)} {...props}>
      {Icono && <Icono size={16} aria-hidden className={tono ? undefined : 'text-ink-3'} />}
      {children}
    </RMenu.Item>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof RMenu.RadioItem>) {
  return (
    <RMenu.RadioItem className={cn(claseItem, 'pr-8', className)} {...props}>
      {children}
      <RMenu.ItemIndicator className="absolute right-2.5 text-accent-fg">
        <CheckIcon size={16} weight="bold" aria-hidden />
      </RMenu.ItemIndicator>
    </RMenu.RadioItem>
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof RMenu.CheckboxItem>) {
  return (
    <RMenu.CheckboxItem className={cn(claseItem, 'pr-8', className)} {...props}>
      {children}
      <RMenu.ItemIndicator className="absolute right-2.5 text-accent-fg">
        <CheckIcon size={16} weight="bold" aria-hidden />
      </RMenu.ItemIndicator>
    </RMenu.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof RMenu.Label>) {
  return <RMenu.Label className={cn('px-2.5 pb-1 pt-2 text-xs font-medium text-ink-3', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof RMenu.Separator>) {
  return <RMenu.Separator className={cn('-mx-1 my-1 h-px bg-line', className)} {...props} />;
}
