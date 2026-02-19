import RoomClient from "@/components/RoomClient";

interface Params {
  params: { code: string };
}

export default function RoomPage({ params }: Params) {
  const code = params.code.toUpperCase();

  return <RoomClient code={code} />;
}

