import Image from "next/image";

export default function Footer() {
  return (
    <footer className="mt-auto w-full max-w-4xl mx-auto px-6 py-6 flex flex-col items-center gap-2 text-sm text-ink/70">
      <Image
        src="/logojdp.png"
        alt="Juegos del Panteón"
        width={100}
        height={100}
        className="w-[100px] h-[100px] object-contain"
      />
      <p>
        created by <b>patchank</b> for Juegos del Panteón
      </p>
    </footer>
  );
}
