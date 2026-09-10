import type { NextConfig } from "next";

// Aucune image distante n'est optimisée : évite la dépendance native « sharp »
// sur le serveur (le dashboard n'utilise pas next/image).
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
