import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/bg.png" alt="bg" fill className="object-cover opacity-70" />
      </div>
      <div className="flex min-h-screen items-center justify-center">
        <Image src="/giphy.gif" alt="loading" width={140} height={140} />
      </div>
    </div>
  );
}


