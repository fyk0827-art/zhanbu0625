import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Props {
  className?: string;
}

/** 右上角：语言切换 */
export function GeneratorTopRightActions({ className = "" }: Props) {
  return (
    <div
      className={`fixed right-4 top-4 z-[300] flex flex-col items-center gap-2 md:right-6 md:top-6 ${className}`}
    >
      <LanguageSwitcher variant="large" theme="prism" dropdownAlign="right" />
    </div>
  );
}
