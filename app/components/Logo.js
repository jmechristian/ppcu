import Image from "next/image";

export default function Logo({ className = "" }) {
  return (
    <Image
      src="/logo.svg"
      alt="Paperboard Packaging Council"
      width={50}
      height={50}
      className={className}
      priority
    />
  );
}
