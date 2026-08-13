import Image from "next/image";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="flex w-full max-w-[360px] flex-col items-center">
        <Image
          src="/Logo/nuvex_logo.svg"
          alt="Nuvex"
          width={270}
          height={86}
          className="max-w-[270px]"
          style={{ width: "auto", height: "auto" }}
          priority
        />

        <div className="relative mt-12 h-4 w-[240px] rounded-full bg-[#eef1f6] sm:w-[300px]">
          <div className="absolute inset-x-[2px] inset-y-[2px] overflow-hidden rounded-full">
            <div className="nuvex-loader-bar absolute left-0 top-0 h-full w-[92px] rounded-full bg-[var(--color-primary)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
