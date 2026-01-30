import { LanguagePicker } from '../ui/language-picker';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh flex flex-col">
      {/* Language picker fixed in top-left corner */}
      <div className="absolute top-4 left-4 z-20 w-18">
        <LanguagePicker />
      </div>

      {/* Main content area that takes all available space but doesn't overflow */}
      <div className="flex flex-col flex-grow min-h-0">
        {/* Content area that scrolls if needed */}
        <div className="flex-grow min-h-0 overflow-auto flex flex-col">
          {children}
        </div>

        {/* Footer that always stays at the bottom */}
        <footer className="flex-shrink-0 flex justify-center pt-2 sm:pt-4 pb-2 sm:pb-8 mt-auto">
          <img
            src="/footer_logo.svg"
            alt="Beutechful Logo"
            className="
              object-contain
              portrait:w-1/2 portrait:max-w-72 portrait:h-18
              landscape:w-1/2 landscape:max-w-66 landscape:h-auto
              sm:portrait:w-3/5 sm:portrait:max-w-84 sm:portrait:h-21
              md:portrait:w-3/4 md:portrait:max-w-96 md:portrait:h-24
              lg:landscape:w-2/5
              xl:landscape:w-1/3
            "
          />
        </footer>
      </div>
    </div>
  );
}
