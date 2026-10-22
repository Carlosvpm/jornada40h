import { redirect } from "next/navigation";

// Links de convite antigos (login com senha) agora levam ao login por código.
export default function ConviteAntigo() {
  redirect("/login");
}
