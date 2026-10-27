export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  sizes?: number[];
};

export const products: Product[] = [
  { id: "paket-tektok", name: "Paket Tektok", price: 50000, image: "/img/pakettektok.jpeg", description: "Paket praktis sepatu, hydropack, headlamp, dan trekking pole.", category: "Paket" , sizes: [37, 38, 39, 40, 41, 42, 43] },
  { id: "sepatu-rubtrack", name: "Sepatu Rubtrack", price: 30000, image: "/img/sepatuu.jpg", description: "Sepatu trekking dengan grip untuk jalur berbatu.", category: "Alas kaki", sizes: [37, 38, 39, 40, 41, 42, 43] },
  { id: "consina-venial", name: "Consina Venial 30L", price: 50000, image: "/img/Daypackconsina.jpg", description: "Daypack 30 liter untuk perjalanan sehari.", category: "Tas" },
  { id: "hydropack", name: "Hydropack Boogaaboo", price: 15000, image: "/img/hydropackk.jpg", description: "Bawa air minum agar tetap mudah dijangkau di jalur.", category: "Hidrasi" },
  { id: "trekking-pole", name: "Trekking Pole", price: 10000, image: "/img/trackingpole.jpg", description: "Aluminium alloy untuk membantu langkah di tanjakan.", category: "Perlengkapan" },
  { id: "nesting-kompor", name: "Nesting + Kompor", price: 25000, image: "/img/nesting.jpeg", description: "Peralatan masak ringkas untuk berkemah.", category: "Memasak" },
  { id: "jaket-gunung", name: "Jaket Gunung", price: 30000, image: "/img/about.jpg", description: "Lapisan hangat untuk menemani udara dingin di gunung.", category: "Pakaian" },
  { id: "headlamp", name: "Headlamp LED", price: 5000, image: "/img/headlamp.jpg", description: "Penerangan praktis untuk perjalanan malam.", category: "Penerangan" },
];

export function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
