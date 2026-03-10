import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const LanguageSelector = ({ variant = "default" }) => {
  const { language, setLanguage, languageOptions } = useLanguage();

  const currentLang = languageOptions.find((l) => l.code === language) || languageOptions[0];

  if (variant === "flags-only") {
    // Compact version with just flags
    return (
      <div className="flex items-center gap-1">
        {languageOptions.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`text-xl p-1 rounded transition-all ${
              language === lang.code
                ? "bg-teal-100 scale-110"
                : "opacity-60 hover:opacity-100 hover:bg-slate-100"
            }`}
            title={lang.name}
            data-testid={`lang-flag-${lang.code}`}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown version
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          data-testid="language-selector"
        >
          <span className="text-lg">{currentLang.flag}</span>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languageOptions.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              language === lang.code ? "bg-teal-50 text-teal-700" : ""
            }`}
            data-testid={`lang-option-${lang.code}`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
