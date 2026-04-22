import QRCode from "qrcode";

type Props = {
  url: string;
};

/** Server-rendered SVG QR for an elevator deep link. */
export async function ElevatorQrSvg({ url }: Props) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    width: 200,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  return (
    <div
      className="inline-block rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 [&_svg]:max-w-[200px]"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
