import fs from "fs";

const SUPABASE_URL = "https://gtyuajboeffmfskofoyh.supabase.co";

let SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SERVICE_KEY) {
  try {
    const env = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
    const match = env.match(/VELURA_SUPABASE_SERVICE_ROLE_KEY=(.*)/);
    if (match) SERVICE_KEY = match[1].trim();
  } catch {}
}

if (!SERVICE_KEY) {
  console.error("Error: Supabase Service Role Key not found in .env!");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  authorization: `Bearer ${SERVICE_KEY}`,
  accept: "application/json",
  prefer: "resolution=merge-duplicates,return=representation",
  "content-type": "application/json"
};

const NEW_BLOGS = [
  /* ──────────────────────────────────────────────────────────
     FEATURED — Bảng màu mùa thu 2026
     ────────────────────────────────────────────────────────── */
  {
    slug: "bang-mau-mua-thu-2026",
    category_slug: "trend",
    title: "Bảng màu mùa thu 2026: Sắc nâu cognac và hồng phấn lên ngôi",
    excerpt: "Năm nay, các nhà mốt lớn đồng loạt giới thiệu bảng màu ấm áp xoay quanh nâu cognac, hồng phấn dịu nhẹ và xanh sage. Velura mách bạn cách phối ba sắc màu chủ đạo để có tủ đồ mùa thu hoàn hảo.",
    image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&h=800&q=80",
    author: "Nguyễn Thu Hà",
    read_minutes: 8,
    is_featured: true,
    published_at: "2026-06-02T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Mùa thu 2026 đánh dấu sự quay trở lại mạnh mẽ của các gam màu trầm ấm, tinh tế. Bảng màu xoay quanh nâu cognac — sắc nâu đỏ gợi nhớ vị rượu sành điệu, hồng phấn pastel tựa cánh hoa đào và xanh sage mộng mơ trở thành bộ ba hoàn hảo cho tủ đồ thu đông.",
      takeaways: [
        "Nâu cognac là sắc màu trung tâm, thay thế hoàn hảo cho đen truyền thống.",
        "Hồng phấn pastel làm dịu các set đồ trầm tối, mang lại nét nữ tính tinh tế.",
        "Xanh sage đóng vai trò cân bằng, làm mát tổng thể mà vẫn giữ chiều sâu.",
        "Phối tối đa 3 tông trong một set để giữ sự hài hòa thị giác."
      ],
      sections: [
        {
          heading: "Nâu cognac: Đẳng cấp thay thế đen kinh điển",
          body: [
            "Cognac là sắc nâu có ánh đỏ ấm, gợi liên tưởng đến vẻ sang trọng của da thuộc và rượu vang thượng hạng. Khác với nâu đất thông thường, cognac có chiều sâu và độ ấm giúp tôn da người châu Á một cách tự nhiên nhất.",
            "Blazer cognac kết hợp quần suông ivory hoặc đầm lụa rủ mềm mại là công thức phối đồ chuẩn chỉnh cho mùa thu. Thêm một chiếc túi da thật cùng tông sẽ hoàn thiện diện mạo thanh lịch mà không hề đơn điệu."
          ],
          productSkus: ["VLR-SD-005", "VLR-AO-001", "VLR-SD-002"]
        },
        {
          heading: "Hồng phấn & Sage: Bộ đôi cân bằng hoàn hảo",
          body: [
            "Sự kết hợp giữa hồng phấn pastel và xanh sage tạo ra bảng màu nhẹ nhàng nhưng đầy tính nghệ thuật. Hồng phấn mang lại nét dịu dàng qua áo blouse lụa hay khăn choàng mỏng, trong khi sage làm nền bằng quần wide-leg hay blazer dáng dài.",
            "Cả hai tông màu đều thuộc họ trung tính mềm (soft neutral), giúp người mặc dễ dàng phối với bất kỳ phụ kiện nào mà vẫn giữ được tổng thể hài hòa, tinh tế."
          ],
          productSkus: ["VLR-SD-004", "VLR-SD-019", "VLR-AO-003"]
        }
      ],
      products: [
        { sku: "VLR-SD-005", note: "Set Gilet Tweed Cocoa tông nâu cognac sang trọng cho mùa thu." },
        { sku: "VLR-SD-004", note: "Set Sage Pleated xanh sage dịu mát cân bằng bảng màu ấm." },
        { sku: "VLR-SD-019", note: "Set Boho Linen Hồng Kem nhẹ nhàng cho những ngày thu nắng nhạt." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     1. Sự kiện — Địch Lệ Nhiệt Ba mặc thiết kế Phan Huy
     ────────────────────────────────────────────────────────── */
  {
    slug: "dich-le-nhiet-ba-phan-huy",
    category_slug: "event",
    title: "Địch Lệ Nhiệt Ba mặc thiết kế Phan Huy trên bìa tạp chí",
    excerpt: "Mỹ nữ Tân Cương Địch Lệ Nhiệt Ba diện đầm Haute Couture 'Cành vàng lá ngọc' của NTK trẻ Phan Huy trên bìa ấn phẩm Marie Claire Trung Quốc.",
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Lê Minh Châu",
    read_minutes: 6,
    is_featured: false,
    published_at: "2026-05-28T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Sự xuất hiện của Địch Lệ Nhiệt Ba trên bìa Marie Claire Trung Quốc số tháng 6/2026 trong thiết kế Haute Couture của nhà thiết kế Việt Nam Phan Huy đã gây tiếng vang lớn trong làng thời trang châu Á.",
      takeaways: [
        "Thiết kế 'Cành vàng lá ngọc' kết hợp kỹ thuật thêu tay truyền thống Việt Nam với phom dáng haute couture Pháp.",
        "Sự kiện đánh dấu lần đầu tiên NTK Việt có tác phẩm trên bìa tạp chí thời trang hàng đầu Trung Quốc.",
        "Xu hướng các ngôi sao quốc tế tìm đến thời trang Việt Nam ngày càng rõ nét."
      ],
      sections: [
        {
          heading: "Khi tinh hoa thủ công Việt chinh phục sao quốc tế",
          body: [
            "Bộ đầm haute couture 'Cành vàng lá ngọc' được NTK Phan Huy dành hơn 800 giờ thêu tay thủ công. Mỗi chi tiết hoa văn được cài cắm tỉ mỉ lấy cảm hứng từ nghệ thuật gốm sứ Bát Tràng và hoa sen Việt Nam.",
            "Với sự kết hợp giữa lụa tơ tằm Việt Nam và organza Pháp, thiết kế mang đến vẻ đẹp vừa thổ cẩm truyền thống vừa hiện đại, xứng đáng xuất hiện trên bìa một ấn phẩm thời trang hàng đầu châu Á."
          ],
          productSkus: ["VLR-SD-010", "VLR-SD-025"]
        }
      ],
      products: [
        { sku: "VLR-SD-010", note: "Set Soft Ceremony thanh lịch lấy cảm hứng từ haute couture." },
        { sku: "VLR-SD-025", note: "Đầm dạ hội Tulle bồng bềnh với kỹ thuật xếp tầng thủ công." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     2. Sự kiện — Hề Mộng Dao diện đầm nhà mốt Việt
     ────────────────────────────────────────────────────────── */
  {
    slug: "he-mong-dao-dam-viet",
    category_slug: "event",
    title: "Hề Mộng Dao diện đầm của nhà mốt Việt trong ảnh cưới",
    excerpt: "Siêu mẫu Hề Mộng Dao chọn đầm ren thêu tinh xảo của local brand Việt trong loạt ảnh pre-wedding cùng doanh nhân Hà Du Quân.",
    image_url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Trần Bảo Ngọc",
    read_minutes: 12,
    is_featured: false,
    published_at: "2026-05-25T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Hôn lễ của siêu mẫu Hề Mộng Dao và doanh nhân Hà Du Quân tại Pháp đã thu hút sự quan tâm lớn từ truyền thông và giới thời trang châu Á. Trong bộ ảnh pre-wedding, cô lựa chọn đầm ren thêu tinh xảo của thương hiệu Việt Montsand.",
      takeaways: [
        "Local brand Việt Nam ngày càng được các ngôi sao quốc tế tin tưởng lựa chọn.",
        "Kỹ thuật thêu ren thủ công Việt Nam đạt trình độ haute couture quốc tế.",
        "Xu hướng wedding dress từ thương hiệu Việt đang bùng nổ tại thị trường châu Á."
      ],
      sections: [
        {
          heading: "Montsand: Khi ren Việt vươn tầm quốc tế",
          body: [
            "Thương hiệu Montsand đã dành hơn 6 tháng để hoàn thiện chiếc đầm cưới ren cho Hề Mộng Dao. Mỗi đường thêu tay được thực hiện bởi nghệ nhân có hơn 20 năm kinh nghiệm tại xưởng may truyền thống Huế.",
            "Thiết kế kết hợp kỹ thuật ren Chantilly cổ điển với motif hoa sen Việt Nam, tạo nên tác phẩm vừa mang hơi thở phương Tây sang trọng vừa giữ được linh hồn văn hóa Đông phương."
          ],
          productSkus: ["VLR-SD-010", "VLR-SD-025"]
        }
      ],
      products: [
        { sku: "VLR-SD-010", note: "Set Soft Ceremony ren tinh xảo lấy cảm hứng từ wedding couture." },
        { sku: "VLR-SD-025", note: "Đầm dạ hội Tulle lộng lẫy cho các dịp lễ trọng đại." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     3. Bền vững — Ba thương hiệu Việt tại London FW
     ────────────────────────────────────────────────────────── */
  {
    slug: "ba-thuong-hieu-viet-london-fw-2026",
    category_slug: "sustainable",
    title: "Ba thương hiệu Việt tại London Fashion Week Spring 2026",
    excerpt: "Lần đầu tiên, ba thương hiệu Việt cùng xuất hiện trong lịch trình chính thức tại London Fashion Week, bao gồm: TRAN HUNG, Montsand và IHF Studio.",
    image_url: "https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Phạm Hoàng Linh",
    read_minutes: 10,
    is_featured: false,
    published_at: "2026-05-20T09:00:00+07:00",
    content: JSON.stringify({
      intro: "London Fashion Week Spring 2026 đánh dấu cột mốc lịch sử khi ba thương hiệu Việt Nam — TRAN HUNG, Montsand and IHF Studio — cùng xuất hiện trong lịch trình chính thức. Đây là bước tiến lớn khẳng định vị thế của thời trang Việt trên bản đồ thời trang quốc tế.",
      takeaways: [
        "TRAN HUNG đã có 13 mùa liên tiếp góp mặt tại London Fashion Week.",
        "BST 'Xuân, Hạ, Thu, Đông,... và Xuân' mang ý niệm vòng tuần hoàn vô hạn của đời người.",
        "Montsand gây ấn tượng với kỹ thuật thêu ren thủ công truyền thống Huế.",
        "IHF Studio mang đến làn gió mới với phong cách sustainable fashion."
      ],
      sections: [
        {
          heading: "TRAN HUNG: 14 mùa và hành trình không ngừng nghỉ",
          body: [
            "Nhà thiết kế Trần Hùng mang đến bộ sưu tập 'Xuân, Hạ, Thu, Đông,... và Xuân' — ý niệm về vòng tuần hoàn vô hạn, gói trọn hành trình nhân sinh từ yêu thương, sinh sôi đến tiếp nối, như mặt trời và mặt trăng xoay quanh nhau trong vũ điệu bất tận.",
            "Với chất liệu organza pha lụa tơ tằm, mỗi thiết kế mang đến cảm giác bay bổng, nhẹ nhàng như cánh hoa đào trong gió xuân. Đây là mùa thứ 14 TRAN HUNG góp mặt tại London Fashion Week — một kỷ lục ấn tượng của thời trang Việt."
          ],
          productSkus: ["VLR-SD-018", "VLR-SD-004"]
        }
      ],
      products: [
        { sku: "VLR-SD-018", note: "Set White Resort lấy cảm hứng từ tinh thần bay bổng tại LFW." },
        { sku: "VLR-SD-004", note: "Set Sage Pleated mang đậm triết lý bền vững của thời trang mới." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     4. Xu hướng — Quiet luxury
     ────────────────────────────────────────────────────────── */
  {
    slug: "quiet-luxury-phai-dep-viet",
    category_slug: "trend",
    title: "Quiet luxury: Vì sao phái đẹp Việt đang chuộng vẻ đẹp sang trọng thầm lặng",
    excerpt: "Sự trở lại của những thiết kế tối giản, chất liệu cao cấp không logo đang định nghĩa lại khái niệm sang trọng.",
    image_url: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Nguyễn Thu Hà",
    read_minutes: 7,
    is_featured: false,
    published_at: "2026-05-18T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Quiet luxury — xu hướng sang trọng thầm lặng — đang dần thay thế phong cách 'logo mania' vốn thống trị thời trang suốt nhiều năm qua. Phái đẹp Việt ngày càng ưa chuộng những thiết kế tinh giản, đặt trọng tâm vào chất liệu và đường cắt.",
      takeaways: [
        "Quiet luxury tập trung vào chất liệu cao cấp thay vì logo thương hiệu.",
        "Đường cắt tối giản nhưng đòi hỏi kỹ thuật may đo chính xác tuyệt đối.",
        "Bảng màu trung tính (nude, ivory, camel) là nền tảng của phong cách này."
      ],
      sections: [
        {
          heading: "Khi ít hơn nghĩa là nhiều hơn",
          body: [
            "Quiet luxury không phải là mặc đồ rẻ. Nó là nghệ thuật chọn lọc tinh tế nhất — một chiếc áo cashmere không logo nhưng giá trị gấp ba chiếc áo phông in tên thương hiệu. Sự sang trọng toát ra từ nếp vải rủ mềm, đường may chắc chắn và phom dáng tôn lên từng đường cong tự nhiên.",
            "Tại Velura, triết lý này được thể hiện qua từng thiết kế: set đồ ivory draped lụa rủ mềm mại hay áo sơ mi tơ tằm có thể mặc đi mặc lại hàng trăm lần mà vẫn đẹp như lần đầu."
          ],
          productSkus: ["VLR-SD-002", "VLR-AO-002"]
        }
      ],
      products: [
        { sku: "VLR-SD-002", note: "Set Ivory Draped lụa rủ — hiện thân của quiet luxury." },
        { sku: "VLR-AO-002", note: "Áo sơ mi lụa tơ tằm mềm mại — đầu tư chất liệu thay vì logo." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     5. Phối đồ — Blazer linen mùa hè
     ────────────────────────────────────────────────────────── */
  {
    slug: "cach-phoi-blazer-linen-mua-he",
    category_slug: "style",
    title: "Cách phối blazer linen cho mùa hè nhiệt đới",
    excerpt: "Blazer không còn là độc quyền của mùa thu. Khám phá 4 công thức phối đồ thoáng mát mà vẫn thanh lịch.",
    image_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Lê Minh Châu",
    read_minutes: 5,
    is_featured: false,
    published_at: "2026-05-14T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Blazer linen là món đồ đa năng bậc nhất cho mùa hè nhiệt đới. Với chất liệu thoáng mát và phom dáng thanh lịch, chiếc blazer giúp bạn tự tin từ văn phòng đến buổi hẹn hò lãng mạn.",
      takeaways: [
        "Chọn blazer linen dáng oversize để tạo cảm giác thoáng đãng trong ngày nóng.",
        "Phối cùng quần suông wide-leg là công thức an toàn nhất.",
        "Màu trung tính (kem, be, xám nhạt) phù hợp nhất cho mùa hè.",
        "Có thể khoác hờ ngoài đầm midi để tạo lớp layer thanh lịch."
      ],
      sections: [
        {
          heading: "4 công thức phối blazer linen chuẩn chỉnh",
          body: [
            "Công thức 1: Blazer kem + quần suông trắng + sandal da — hoàn hảo cho ngày đi làm mùa hè. Công thức 2: Blazer be + đầm midi linen + mũ cói — set đồ dạo phố cuối tuần phóng khoáng.",
            "Công thức 3: Blazer oversize + crop top + quần jeans ống rộng — cá tính, năng động cho buổi brunch. Công thức 4: Blazer linen xanh sage + quần culotte ivory + clutch cói — thanh lịch đi sự kiện buổi tối."
          ],
          productSkus: ["VLR-SD-004", "VLR-AO-003"]
        }
      ],
      products: [
        { sku: "VLR-SD-004", note: "Set Sage dịu mát phối blazer linen hoàn hảo cho mùa hè." },
        { sku: "VLR-AO-003", note: "Áo Peplum cổ vuông xanh sage thanh lịch layer cùng blazer." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     6. Sự kiện — Á khôi Thanh Hương áo dài cổ yếm
     ────────────────────────────────────────────────────────── */
  {
    slug: "a-khoi-thanh-huong-ao-dai-co-yem",
    category_slug: "event",
    title: "Á khôi Thanh Hương gợi ý diện mốt áo dài cổ yếm hot trend",
    excerpt: "Trước đó, nhiều sao Việt như hoa hậu Thanh Thủy, á hậu Phương Anh, diễn viên Phương Anh Đào... cũng chọn áo dài cổ yếm để xuống phố hay đi sự kiện.",
    image_url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Trần Bảo Ngọc",
    read_minutes: 4,
    is_featured: false,
    published_at: "2026-05-10T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Áo dài cổ yếm đang trở thành xu hướng 'hot trend' được nhiều sao Việt lựa chọn. Á khôi Thanh Hương gần đây gây ấn tượng khi diện mốt áo dài cách tân này tại nhiều sự kiện lớn.",
      takeaways: [
        "Áo dài cổ yếm kế thừa di sản truyền thống và phá cách phù hợp phụ nữ hiện đại.",
        "NTK Lê Ngọc Lâm là người tiên phong mang áo dài cổ yếm vào thời trang đương đại.",
        "Phong cách này phù hợp cả sự kiện trang trọng lẫn dạo phố thường ngày."
      ],
      sections: [
        {
          heading: "Áo dài cổ yếm: Khi truyền thống gặp hiện đại",
          body: [
            "Nhiều nhà thiết kế và local brand Việt đã cho ra mắt các mẫu áo dài cổ yếm phù hợp tiết trời mùa xuân. NTK Lê Ngọc Lâm nhận định áo dài cách tân cổ yếm kế thừa di sản truyền thống và phá cách phù hợp phụ nữ hiện đại.",
            "Điểm đặc biệt của áo dài cổ yếm nằm ở phần cổ áo được cắt thấp hình chữ V, khoe bờ vai thon gọn một cách tinh tế. Kết hợp với chất liệu lụa tơ tằm mỏng nhẹ, chiếc áo mang đến vẻ đẹp vừa truyền thống vừa quyến rũ."
          ],
          productSkus: ["VLR-SD-010", "VLR-AO-004"]
        }
      ],
      products: [
        { sku: "VLR-SD-010", note: "Set Soft Ceremony thanh lịch lấy cảm hứng từ áo dài cổ yếm." },
        { sku: "VLR-AO-004", note: "Áo cổ yếm lụa tinh tế tôn dáng người phụ nữ Việt." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     7. Phỏng vấn — Đặng Mỹ Linh
     ────────────────────────────────────────────────────────── */
  {
    slug: "dang-my-linh-thoi-trang-nhat-ky",
    category_slug: "interview",
    title: "Đặng Mỹ Linh: 'Thời trang là cách tôi viết nhật ký'",
    excerpt: "Nữ doanh nhân trẻ chia sẻ về hành trình xây dựng phong cách cá nhân và bộ sưu tập áo dài hiện đại.",
    image_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Nguyễn Thu Hà",
    read_minutes: 9,
    is_featured: false,
    published_at: "2026-05-06T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Đặng Mỹ Linh — nữ doanh nhân trẻ thế hệ millennials — chia sẻ rằng cô coi trang phục như những trang nhật ký ghi lại từng chương trong cuộc đời. Mỗi giai đoạn, mỗi tâm trạng đều được phản ánh qua cách cô chọn chất liệu, màu sắc và phom dáng.",
      takeaways: [
        "Phong cách cá nhân cần được xây dựng từ sự thấu hiểu bản thân.",
        "Đầu tư vào chất liệu tốt giúp trang phục đồng hành lâu dài.",
        "Áo dài hiện đại có thể mặc hàng ngày, không chỉ dịp lễ tết."
      ],
      sections: [
        {
          heading: "Khi mỗi outfit kể một câu chuyện",
          body: [
            "Mỹ Linh chia sẻ: 'Tôi không chạy theo xu hướng. Tôi chọn những món đồ khiến mình cảm thấy đúng — đúng với tâm trạng hôm đó, đúng với con người mình đang trở thành.' Cô tin rằng phong cách cá nhân là hành trình chứ không phải đích đến.",
            "Bộ sưu tập áo dài hiện đại của cô — những chiếc áo dài cách tân có thể mặc đi café, đi làm hay đi sự kiện — là minh chứng cho triết lý này. Mỗi thiết kế đều mang dấu ấn cá nhân, từ chi tiết thêu tay đến cách phối màu."
          ],
          productSkus: ["VLR-AO-002", "VLR-SD-003"]
        }
      ],
      products: [
        { sku: "VLR-AO-002", note: "Áo sơ mi lụa tơ tằm — nền tảng của phong cách tinh giản." },
        { sku: "VLR-SD-003", note: "Set Midnight Blue chạm eo tinh tế tôn nét quyến rũ cá nhân." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     8. Bền vững — Hành trình váy linen tại xưởng Velura
     ────────────────────────────────────────────────────────── */
  {
    slug: "hanh-trinh-vay-linen-xuong-velura",
    category_slug: "sustainable",
    title: "Hành trình của một chiếc váy linen tại xưởng Velura",
    excerpt: "Từ cánh đồng lanh ở Normandie đến tay người mặc — câu chuyện về sự tỉ mỉ và tình yêu với chất liệu tự nhiên.",
    image_url: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Phạm Hoàng Linh",
    read_minutes: 11,
    is_featured: false,
    published_at: "2026-05-02T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Mỗi chiếc váy linen tại Velura đều mang trong mình một hành trình dài — từ cánh đồng lanh hữu cơ ở vùng Normandie (Pháp) qua bàn tay nghệ nhân dệt, nhuộm, cắt may cho đến khi chạm vào làn da người mặc. Đó là câu chuyện về sự tỉ mỉ, kiên nhẫn và tình yêu.",
      takeaways: [
        "Sợi lanh Normandie cho ra thớ sợi dai bền, mềm mại hơn sau mỗi lần giặt.",
        "Quy trình nhuộm tự nhiên không sử dụng hóa chất độc hại.",
        "Mỗi chiếc váy linen là sản phẩm thủ công mang dấu ấn cá nhân."
      ],
      sections: [
        {
          heading: "Từ cánh đồng lanh đến xưởng may Velura",
          body: [
            "Hành trình bắt đầu từ vùng Normandie — nơi có khí hậu ôn đới lý tưởng cho cây lanh phát triển tự nhiên. Sợi lanh được thu hoạch thủ công, phơi khô dưới nắng tự nhiên và dệt thành vải trên khung cửi truyền thống.",
            "Tại xưởng Velura, từng tấm vải linen được kiểm tra kỹ lưỡng trước khi cắt may. Nghệ nhân may đo tỉ mỉ từng đường kim mũi chỉ, đảm bảo phom dáng vừa vặn và thoải mái nhất cho người mặc."
          ],
          productSkus: ["VLR-SD-016", "VLR-AO-003"]
        }
      ],
      products: [
        { sku: "VLR-SD-016", note: "Set dạo biển linen thô mộc — sản phẩm tiêu biểu từ xưởng Velura." },
        { sku: "VLR-AO-003", note: "Áo Peplum cổ vuông xanh sage — chất liệu tự nhiên tinh khiết." }
      ]
    })
  },

  /* ──────────────────────────────────────────────────────────
     9. Phối đồ — Công thức phối đồ resort
     ────────────────────────────────────────────────────────── */
  {
    slug: "cong-thuc-phoi-do-resort-he-2026",
    category_slug: "style",
    title: "Công thức phối đồ resort hè 2026: Từ sân bay đến bữa tối",
    excerpt: "Vali 3 ngày với 5 món đồ linh hoạt. Cách phối set linen, đầm maxi và phụ kiện cho chuyến đi biển hoàn hảo.",
    image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&h=600&q=80",
    author: "Lê Minh Châu",
    read_minutes: 7,
    is_featured: false,
    published_at: "2026-04-28T09:00:00+07:00",
    content: JSON.stringify({
      intro: "Nghệ thuật xếp vali đi nghỉ dưỡng không nằm ở việc bạn mang theo bao nhiêu món đồ, mà ở khả năng biến hóa linh hoạt của từng thiết kế. Xu hướng resort wear hè 2026 tập trung tối giản hóa số lượng trang phục bằng cách ưu tiên các phom dáng thông minh.",
      takeaways: [
        "Công thức xếp đồ 5-4-3-2-1 giúp vali gọn nhẹ nhưng đa năng tối đa.",
        "Tông màu trung tính làm chủ đạo để dễ phối chéo các mảnh ghép.",
        "Phụ kiện chất liệu cói, gỗ hay canvas thô tạo điểm nhấn coastal phóng khoáng."
      ],
      sections: [
        {
          heading: "Từ sân bay đến sảnh chờ khách sạn",
          body: [
            "Trang phục di chuyển đòi hỏi sự co giãn tốt, thoáng khí nhưng không được quá xuề xòa. Lựa chọn tối ưu là quần suông rộng chất liệu linen pha cotton kết hợp cùng áo dệt kim nhẹ hoặc thun cao cấp dáng ôm vừa vặn.",
            "Hoàn thiện set đồ bằng một chiếc sơ mi khoác ngoài dáng dài hoặc blazer không cấu trúc vai. Thiết kế này bảo vệ bạn khỏi luồng gió điều hòa lạnh tại sân bay, đồng thời giữ diện mạo lịch sự khi đặt chân tới sảnh resort."
          ],
          productSkus: ["VLR-SD-016", "VLR-SD-018"]
        }
      ],
      products: [
        { sku: "VLR-SD-016", note: "Set dạo biển linen thoáng mát, linh hoạt di chuyển." },
        { sku: "VLR-SD-018", note: "Set White Resort linen bay bổng tôn dáng nữ thần biển." }
      ]
    })
  }
];

async function seed() {
  console.log("Upserting new modern blogs to Supabase database...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog`, {
    method: "POST",
    headers,
    body: JSON.stringify(NEW_BLOGS)
  });

  if (!res.ok) {
    console.error("Failed to seed blogs:", await res.text());
    process.exit(1);
  }

  console.log("Successfully seeded new modern blog posts into Supabase database.");
}

seed().catch(console.error);
