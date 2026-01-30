interface FormLayoutProps {
  child_small: React.ReactNode;
  child_large: React.ReactNode;
}

export function SmallLarge({ child_small, child_large }: FormLayoutProps) {
  return (
    <div>
      <div className="block sm:hidden">{child_small}</div>
      <div className="hidden lg:block">{child_large}</div>
    </div>
  );
}
