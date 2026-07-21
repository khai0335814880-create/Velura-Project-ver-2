# Đặc tả Định vị Chức năng & Kỹ thuật — Velura User Web

**Tên tiếng Anh:** Functional Positioning & Technical Specs  
**Phạm vi rà soát:** giao diện User Web, các API phục vụ khách hàng và các dịch vụ AI liên quan  
**Mục đích:** giúp người đọc hiểu rõ hệ thống làm được gì, mang lại lợi ích gì, hoạt động ra sao và còn giới hạn ở đâu  
**Ngày rà soát:** 21/07/2026

> Tài liệu được viết lại theo ngôn ngữ dễ hiểu. Những thuật ngữ kỹ thuật cần thiết đều được giải thích bằng tiếng Việt ngay tại chỗ. Nội dung vẫn bám sát source code hiện tại và không mô tả vượt quá chức năng đã triển khai.

---

## 1. Tóm tắt dễ hiểu về hệ thống

Velura User Web là website mua sắm thời trang dành cho khách hàng. Người dùng có thể đi từ bước xem sản phẩm, tìm kiếm, chọn màu và kích thước, thêm vào giỏ hàng, đặt hàng, theo dõi đơn, đánh giá, đổi trả cho đến nhận tư vấn phối đồ bằng AI.

Website được xây theo dạng nhiều trang HTML. Nói đơn giản, khi người dùng chuyển từ trang sản phẩm sang trang giỏ hàng, trình duyệt sẽ mở một trang mới thay vì chỉ thay đổi một phần màn hình như các ứng dụng React. Cách làm này phù hợp với quy mô đồ án, dễ triển khai nhưng việc chia sẻ dữ liệu giữa các trang phải dựa vào bộ nhớ trình duyệt hoặc gọi lại API.

### 1.1. Những phần đã dùng dữ liệu thật

- Danh mục, sản phẩm, giá, màu, kích thước và tồn kho được đọc từ cơ sở dữ liệu Supabase.
- Thành viên có thể lưu hồ sơ, địa chỉ, danh sách yêu thích và giỏ hàng vào hệ thống.
- Hệ thống có thể tạo đơn hàng, kiểm tra voucher, trừ tồn kho, theo dõi đơn, gửi đánh giá và yêu cầu đổi trả.
- Style Quiz có thể tạo hồ sơ phong cách và lưu lại cho thành viên.
- AI có thể dùng hồ sơ phong cách và dữ liệu sản phẩm thật để tạo gợi ý.
- Chatbot có lịch sử trò chuyện, có thể hiển thị sản phẩm và chuyển cuộc hội thoại sang nhân viên CSKH.

### 1.2. Những phần mới ở mức mô phỏng hoặc còn giới hạn

- Thanh toán VNPay và MoMo mới mô phỏng quy trình thành công/thất bại, chưa kết nối cổng thanh toán thật.
- Chưa kết nối hãng vận chuyển để báo phí hoặc theo dõi vị trí kiện hàng theo thời gian thực.
- Cơ chế mật khẩu và OTP tự xây dựng còn có mã dùng cho demo, chưa đủ an toàn để đưa thẳng vào sản xuất.
- Tìm kiếm thông thường chủ yếu xử lý trên danh sách sản phẩm đã tải về trình duyệt, chưa phải công cụ tìm kiếm lớn như Elasticsearch.
- Một số nội dung banner, xu hướng tìm kiếm và dữ liệu dự phòng vẫn được viết sẵn trong giao diện.

### 1.3. Thang đánh giá mức độ hoàn thiện

| Mức | Cách hiểu đơn giản |
|---|---|
| **M3 — Đã nối nghiệp vụ thật** | Có giao diện, API và cơ sở dữ liệu; người dùng có thể thực hiện một quy trình tương đối hoàn chỉnh. |
| **M2 — Bản mẫu nâng cao** | Có xử lý và dữ liệu thật nhưng còn dùng bộ nhớ trình duyệt, dữ liệu dự phòng hoặc dịch vụ mô phỏng. |
| **M1 — Chủ yếu là giao diện** | Người dùng có thể bấm và nhập dữ liệu nhưng chưa tạo thay đổi thật ở backend. |
| **M0 — Chưa triển khai** | Mới là ý tưởng hoặc không tìm thấy bằng chứng trong source code. |

### 1.4. Bảng định vị nhanh

| Nhóm chức năng | Mức hiện tại | Diễn giải ngắn |
|---|---|---|
| Xem sản phẩm và biến thể | M3 | Dùng sản phẩm, giá, màu, size và tồn kho thật. |
| Tìm kiếm | M2 | Tìm trên dữ liệu thật nhưng chủ yếu xử lý ngay trong trình duyệt. |
| Lọc, sắp xếp, chia trang | M2 | Đầy đủ cho đồ án nhưng phải tải catalog trước rồi mới xử lý. |
| Đăng ký và đăng nhập | M2 | Luồng hoạt động được nhưng cơ chế mật khẩu/OTP tự xây chưa đạt chuẩn production. |
| Hồ sơ và địa chỉ | M3 | Đọc và cập nhật dữ liệu thật qua API. |
| Danh sách yêu thích | M3 với thành viên, M2 với khách | Thành viên lưu vào hệ thống; khách chỉ lưu trên thiết bị hiện tại. |
| Giỏ hàng | M3 với thành viên, M2 với khách | Thành viên có giỏ hàng trong DB; khách dùng bộ nhớ trình duyệt. |
| Đặt hàng và COD | M3 | Có kiểm tra hàng, voucher và tạo đơn thật trong hệ thống. |
| VNPay/MoMo | M1 | Chỉ mô phỏng kết quả thanh toán. |
| Theo dõi đơn | M3 | Có danh sách, chi tiết, hủy đơn và liên kết đánh giá/đổi trả. |
| Style Quiz | M3 với thành viên, M2 với khách | Thành viên lưu hồ sơ lâu dài; dữ liệu khách có thể mất khi đổi thiết bị. |
| AI gợi ý phối đồ | M3 về thuật toán, M2 về vận hành | Có tìm kiếm theo ý nghĩa, chấm điểm và AI phối set; phụ thuộc dữ liệu và khóa AI. |
| Chatbot AI | M3 về tích hợp, M2 về vận hành | Có dữ liệu thật, thẻ sản phẩm và chuyển CSKH; chưa chat thời gian thực. |
| Đánh giá | M3 nghiệp vụ, M2 kiểm duyệt | Chỉ người đã mua mới đánh giá; kiểm duyệt hiện dựa vào từ khóa. |
| Đổi trả | M3 trong nội bộ | Có tạo và theo dõi yêu cầu; chưa hoàn tiền hay tạo vận đơn thật. |
| Blog và chính sách | M3/M2 | Cơ sở dữ liệu là nguồn chính nhưng có nội dung dự phòng viết sẵn. |
| Form liên hệ | M1 | Mới kiểm tra dữ liệu ở giao diện, chưa gửi về hệ thống. |

---

## 2. Một số thuật ngữ cần biết

| Thuật ngữ | Giải thích dễ hiểu |
|---|---|
| **Frontend / giao diện** | Phần website người dùng nhìn thấy và trực tiếp thao tác. |
| **Backend / máy chủ** | Phần xử lý phía sau: kiểm tra dữ liệu, áp dụng quy tắc và làm việc với cơ sở dữ liệu. |
| **API** | “Cầu nối” để giao diện gửi yêu cầu tới backend và nhận dữ liệu trả về. |
| **Database / cơ sở dữ liệu** | Nơi lưu lâu dài sản phẩm, tài khoản, đơn hàng và các dữ liệu nghiệp vụ khác. |
| **LocalStorage** | Bộ nhớ trên trình duyệt, vẫn còn sau khi đóng tab nhưng chỉ tồn tại trên thiết bị/trình duyệt đó. |
| **SessionStorage** | Bộ nhớ tạm của một tab; thường mất khi đóng tab. |
| **JWT / access token** | Chuỗi mã chứng minh người dùng đã đăng nhập; giao diện gửi mã này kèm mỗi yêu cầu cần xác thực. |
| **Biến thể sản phẩm** | Một phiên bản cụ thể của sản phẩm, ví dụ áo màu đen size M. Mỗi biến thể có tồn kho riêng. |
| **Client-side** | Xử lý ngay trên trình duyệt của người dùng. |
| **Server-side** | Xử lý ở backend hoặc cơ sở dữ liệu. |
| **Embedding** | Cách AI chuyển nội dung thành một dãy số để so sánh mức độ giống nhau về ý nghĩa. |
| **Vector search** | Tìm nội dung gần nhau về ý nghĩa dựa trên các dãy số embedding, không chỉ dựa vào từ giống hệt. |
| **RAG** | AI tìm dữ liệu thật liên quan trước, sau đó dùng dữ liệu đó để tạo câu trả lời. |
| **Fallback / phương án dự phòng** | Cách xử lý thay thế khi API hoặc AI chính gặp lỗi. |
| **Polling** | Giao diện hỏi máy chủ lặp lại sau một khoảng thời gian để xem có tin nhắn mới hay chưa. |
| **Mock / mô phỏng** | Luồng giả lập để trình diễn cách hoạt động nhưng chưa kết nối dịch vụ thật. |

---

## 3. Kiến trúc User Web và hành trình khách hàng

### 3.1. Định vị chức năng & phạm vi

User Web bao phủ gần như toàn bộ hành trình mua sắm của một khách hàng:

1. **Khám phá:** người dùng vào trang chủ, xem danh mục, sản phẩm nổi bật, bộ sưu tập, combo và bài viết thời trang.
2. **Tìm sản phẩm phù hợp:** người dùng tìm bằng từ khóa, lọc theo giá, màu, size, thương hiệu hoặc dáng người.
3. **Cân nhắc:** người dùng xem chi tiết, tồn kho, đánh giá, chọn đúng màu/size và lưu vào danh sách yêu thích.
4. **Mua hàng:** người dùng thêm vào giỏ, chọn sản phẩm cần thanh toán, nhập địa chỉ, dùng voucher và tạo đơn.
5. **Sau mua:** người dùng xem tiến trình đơn, hủy khi còn được phép, đánh giá hoặc gửi yêu cầu đổi trả.
6. **Cá nhân hóa:** người dùng làm Style Quiz để nhận gợi ý màu sắc, kiểu dáng, sản phẩm và set đồ phù hợp.
7. **Nhận hỗ trợ:** người dùng hỏi chatbot về sản phẩm/chính sách; nếu AI không giải quyết được thì yêu cầu nhân viên CSKH tiếp nhận.

**Giá trị thực tế:** khách hàng không phải dùng nhiều hệ thống rời rạc. Dữ liệu sản phẩm, giỏ hàng, đơn hàng, đánh giá, đổi trả và AI được nối trong cùng một hành trình.

### 3.2. Giới hạn chức năng

- Website là ứng dụng nhiều trang nên chuyển trang sẽ tải lại HTML.
- Không có một kho trạng thái chung như Redux; các trang trao đổi dữ liệu tạm qua LocalStorage, SessionStorage hoặc API.
- Một số file JavaScript đang chứa quá nhiều trách nhiệm, gây khó bảo trì khi dự án mở rộng.
- Chưa hỗ trợ dùng khi mất mạng, cài như ứng dụng PWA hoặc đồng bộ offline.
- Giao diện chủ yếu dùng tiếng Việt và chưa có hệ thống đa ngôn ngữ hoàn chỉnh.

### 3.3. Cách hoạt động phía sau

- Vite đóng gói nhiều trang HTML riêng biệt.
- Header, footer và ô tìm kiếm dùng lại được chèn vào từng trang.
- Giao diện gọi API Node.js để lấy dữ liệu và thực hiện nghiệp vụ.
- API Node.js làm việc với Supabase, dịch vụ AI và hệ thống email.
- Khi người dùng đã đăng nhập, giao diện gửi token trong phần `Authorization` để backend nhận diện tài khoản.

---

## 4. Trang chủ và khám phá sản phẩm

### 4.1. Định vị chức năng & phạm vi

Trang chủ đóng vai trò như “cửa hàng phía trước” của Velura. Khi mới truy cập, người dùng có thể:

- Xem các danh mục nổi bật để đi nhanh tới nhóm sản phẩm mình quan tâm.
- Xem sản phẩm nổi bật và sản phẩm bán chạy, bao gồm ảnh, giá, giá khuyến mãi, số đã bán và đánh giá.
- Xem combo hoặc bộ sưu tập để khám phá nhiều món có thể phối cùng nhau.
- Bấm vào sản phẩm để xem chi tiết đầy đủ.
- Thêm sản phẩm vào danh sách yêu thích ngay từ thẻ sản phẩm.
- Thêm nhanh vào giỏ nếu sản phẩm có lựa chọn phù hợp; nếu cần chọn màu/size thì website dẫn tới trang chi tiết.
- Xem các thông điệp như chính sách đổi trả, giao hàng hoặc lợi ích thành viên.
- Trượt qua các nhóm sản phẩm bằng nút điều hướng; một số khu vực tự chuyển sau một khoảng thời gian.
- Nếu đã làm Style Quiz, người dùng có thể được ưu tiên hiển thị nội dung liên quan hơn với hồ sơ phong cách.

**Ví dụ:** một khách chưa biết chính xác cần mua gì có thể bắt đầu từ “Sản phẩm bán chạy”, mở một chiếc váy, xem đánh giá rồi thêm vào yêu thích. Một khách đã có Style Profile có thêm lối đi tới các gợi ý phù hợp với phong cách của mình.

**Giá trị thực tế:** trang chủ rút ngắn thời gian từ lúc khách ghé website đến lúc tìm thấy sản phẩm có khả năng mua. Danh mục và bộ sưu tập cũng giúp khách khám phá thêm sản phẩm ngoài món ban đầu.

### 4.2. Giới hạn chức năng

- Vị trí và quy tắc chọn nội dung nổi bật chủ yếu do giao diện quy định, chưa có hệ thống quản trị trưng bày chuyên sâu.
- Chưa ghi nhận đầy đủ việc sản phẩm nào đã xuất hiện, được bấm hoặc dẫn đến mua hàng để tự tối ưu thứ tự.
- Tự chuyển slide chỉ là bộ đếm thời gian trên trình duyệt, không phải AI đề xuất.
- Khi API gặp lỗi, một số khu vực có thể trống hoặc dùng nội dung dự phòng viết sẵn.

### 4.3. Cách hoạt động phía sau

- `homepage.js` gọi API danh mục, sản phẩm, Style Quiz và chính sách.
- Giá, tồn kho, số đã bán và đánh giá đến từ dữ liệu backend, không phải con số trang trí trên giao diện.
- Thành viên lưu yêu thích vào hệ thống; khách chưa đăng nhập lưu trên trình duyệt.

---

## 5. Hệ thống tìm kiếm

### 5.1. Định vị chức năng & phạm vi

Người dùng mở ô tìm kiếm từ phần đầu trang mà không cần rời khỏi trang đang xem. Hệ thống hỗ trợ:

- Hiển thị một lớp tìm kiếm phủ lên nội dung hiện tại.
- Khi người dùng ngừng gõ khoảng 250 mili giây, hệ thống bắt đầu tìm và hiện tối đa 8 sản phẩm gợi ý.
- Mỗi kết quả có ảnh, tên, giá hiện tại, giá cũ và danh mục để người dùng nhận biết nhanh.
- Tìm không phân biệt chữ hoa/chữ thường và có thể bỏ dấu tiếng Việt. Ví dụ “ao so mi” vẫn có thể khớp “Áo sơ mi”.
- Ưu tiên sản phẩm có tên trùng hoàn toàn, bắt đầu bằng từ khóa hoặc chứa nhiều từ trong câu tìm kiếm.
- Lưu những từ khóa vừa tìm để người dùng chọn lại hoặc xóa từng từ.
- Hiển thị từ khóa xu hướng và danh mục phổ biến cho người chưa biết nên tìm gì.
- Khi nhấn Enter hoặc chọn từ khóa, chuyển tới trang danh sách sản phẩm và giữ từ khóa trong địa chỉ URL.

**Ví dụ:** khi gõ “váy đen”, người dùng thấy ngay các sản phẩm có “váy” và “đen” trong tên hoặc thông tin liên quan. Nếu muốn xem nhiều kết quả và dùng bộ lọc, họ nhấn Enter để tới trang catalog.

**Giá trị thực tế:** người dùng tìm sản phẩm nhanh hơn, ít phải đi qua nhiều danh mục. Lịch sử tìm kiếm giúp tránh gõ lại, còn từ khóa xu hướng tạo gợi ý cho khách đang tham khảo.

### 5.2. Giới hạn chức năng

- Ô tìm kiếm tải danh sách sản phẩm rồi tìm ngay trên trình duyệt, chưa gửi từng từ khóa xuống database.
- Chưa tự sửa lỗi chính tả. Ví dụ gõ sai quá nhiều ký tự có thể không tìm thấy kết quả.
- Chưa hiểu từ đồng nghĩa một cách đầy đủ và chưa học từ hành vi tìm kiếm của khách.
- Không hỗ trợ tìm bằng giọng nói hoặc bằng ảnh trong ô tìm kiếm thông thường.
- Từ khóa “xu hướng” hiện là danh sách viết sẵn, không được tính từ lượt tìm thật.
- Lịch sử tìm kiếm chỉ nằm trên trình duyệt hiện tại, không đi theo tài khoản sang thiết bị khác.
- Chưa có báo cáo riêng cho những từ khóa không có kết quả.

### 5.3. Cách hoạt động phía sau

- Lịch sử tìm kiếm lưu trong `LocalStorage` với khóa `velura_recent_searches`.
- Từ khóa xu hướng lấy từ file dữ liệu tĩnh `search-mock.js`.
- Thuật toán tìm kiếm chấm điểm: tên trùng hoàn toàn được ưu tiên cao nhất; tiếp theo là tên bắt đầu bằng từ khóa, chứa đủ từ, chứa từng từ và trùng danh mục.
- Đây là tìm kiếm theo từ và điểm số trên trình duyệt. Tìm kiếm theo ý nghĩa bằng AI chỉ có trong phần AI Personalization và Chatbot.

**Cách trình bày khi bảo vệ:** “Search thông thường dùng sản phẩm thật và có cơ chế chấm điểm độ liên quan, nhưng chưa phải công cụ tìm kiếm AI hoặc tìm kiếm quy mô lớn phía server.”

---

## 6. Danh sách sản phẩm, bộ lọc, sắp xếp và chia trang

### 6.1. Định vị chức năng & phạm vi

Tại trang danh sách sản phẩm, người dùng có thể thu hẹp kết quả theo nhiều nhu cầu:

- **Danh mục:** chỉ xem váy, áo, quần, phụ kiện hoặc nhóm tương ứng.
- **Khoảng giá:** loại bỏ sản phẩm nằm ngoài ngân sách.
- **Màu:** lọc theo màu có trong các biến thể của sản phẩm.
- **Kích thước:** chỉ giữ sản phẩm có size mong muốn.
- **Thương hiệu hoặc bộ sưu tập:** tập trung vào nhãn/nhóm yêu thích.
- **Dáng người:** dùng metadata sản phẩm để chọn món được đánh dấu phù hợp với dáng người đó.
- **Nhóm đặc biệt:** ví dụ sản phẩm nổi bật hoặc các nhóm được giao diện hỗ trợ.
- **Bộ lọc cá nhân hóa:** nếu có Style Profile, website có thể gợi ý sẵn ngân sách, màu, size và dáng người.

Người dùng cũng có thể:

- Sắp xếp theo độ liên quan, giá thấp đến cao, giá cao đến thấp, mức phổ biến hoặc mới nhất.
- Xem 12 sản phẩm mỗi trang và chuyển trang.
- Nhìn thấy trạng thái hết hàng dựa trên tồn của từng biến thể.
- Xóa một bộ lọc hoặc đặt lại toàn bộ khi không có kết quả.

**Ví dụ:** người dùng có thể chọn “Váy”, giá dưới 1 triệu, màu đen, size M. Kết quả chỉ còn những sản phẩm đáp ứng đồng thời các điều kiện đó.

**Giá trị thực tế:** bộ lọc giúp khách không phải xem hàng trăm sản phẩm không phù hợp. Gợi ý từ Style Profile giảm thêm thời gian chọn lựa và tạo cảm giác website hiểu nhu cầu cá nhân.

### 6.2. Giới hạn chức năng

- Website tải toàn bộ catalog trước rồi mới lọc, sắp xếp và chia trang trên trình duyệt. Khi số sản phẩm tăng rất lớn, thời gian tải và bộ nhớ sử dụng cũng tăng.
- Chưa chia trang và lọc hoàn toàn ở backend bằng các truy vấn tối ưu cho dữ liệu lớn.
- Không phải mọi lựa chọn lọc đều được ghi đầy đủ vào URL, nên gửi đường link cho người khác có thể không tái hiện đúng toàn bộ bộ lọc.
- Mức “phổ biến” chủ yếu dựa vào tổng số đã bán, chưa ưu tiên xu hướng gần đây.
- Lọc theo dáng người dựa trên dữ liệu gắn sẵn cho sản phẩm, không phải AI nhìn ảnh cơ thể.

### 6.3. Cách hoạt động phía sau

- `product-catalog.js` tải sản phẩm từ `/api/user/products`.
- Mỗi trang lấy 12 phần tử từ mảng kết quả.
- Giá dùng giá khuyến mãi nếu có, nếu không dùng giá gốc.
- Tồn có thể bán được tính từ tồn thực tế trừ số lượng đang được giữ chỗ.
- Việc bật/tắt gợi ý bộ lọc AI được lưu trong LocalStorage.

---

## 7. Chi tiết sản phẩm, màu, kích thước và combo

### 7.1. Định vị chức năng & phạm vi

Trang chi tiết giúp người dùng trả lời ba câu hỏi trước khi mua: “Sản phẩm này có phù hợp không?”, “Còn đúng màu/size không?” và “Tôi sẽ nhận đúng phiên bản nào?”.

Người dùng có thể:

- Xem nhiều ảnh sản phẩm, mô tả, giá gốc, giá bán, điểm đánh giá và số lượng đã bán.
- Xem các đánh giá đã được duyệt từ khách hàng khác.
- Chọn màu và size. Website đối chiếu hai lựa chọn này để tìm đúng biến thể sản phẩm.
- Xem số lượng còn có thể mua của biến thể đã chọn.
- Chọn số lượng nhưng không vượt quá tồn khả dụng.
- Xem bảng kích thước; với phụ kiện không có size, khu vực này được ẩn để tránh gây nhầm lẫn.
- Nhận lời nhắc về màu, kiểu dáng hoặc size dựa trên Style Profile.
- Thêm vào giỏ, mua ngay hoặc thêm vào danh sách yêu thích.
- Xem các sản phẩm liên quan để tiếp tục khám phá.

Với sản phẩm combo, người dùng còn có thể:

- Xem combo gồm những sản phẩm nào.
- Chọn màu/size riêng cho từng thành phần.
- Chỉ thêm combo khi các thành phần cần thiết đều có biến thể phù hợp.

**Giá trị thực tế:** việc dùng đúng mã biến thể giúp tránh tình trạng khách chọn áo đen size M nhưng hệ thống lại trừ tồn của áo trắng size L. Combo hỗ trợ bán kèm và giúp khách dễ hình dung một bộ trang phục hoàn chỉnh.

### 7.2. Giới hạn chức năng

- Gợi ý size dựa trên số đo và quy tắc, chưa học từ dữ liệu mặc vừa hoặc đổi trả thực tế.
- Không có thử đồ ảo AR, ảnh 360 độ hoặc video riêng cho từng biến thể.
- Sản phẩm liên quan chủ yếu được lọc từ dữ liệu catalog, chưa học từ hành vi “khách mua sản phẩm này thường mua thêm gì”.
- Ở một số khu gợi ý AI, nút thêm nhanh phải dẫn về trang chi tiết vì người dùng chưa chọn màu/size.

### 7.3. Cách hoạt động phía sau

- API chi tiết trả sản phẩm, danh mục, biến thể, đánh giá đã duyệt, số bán và thành phần combo nếu có.
- `options.js` ghép lựa chọn màu và size thành đúng `variant_id`.
- Backend đọc các bảng sản phẩm, biến thể, combo, đánh giá và đơn hàng trong Supabase.

---

## 8. Danh sách yêu thích

### 8.1. Định vị chức năng & phạm vi

Người dùng có thể lưu hoặc bỏ lưu sản phẩm từ nhiều nơi: trang chủ, catalog, bộ sưu tập, trang chi tiết, gợi ý AI và sản phẩm do chatbot giới thiệu.

Website hỗ trợ:

- Hiển thị biểu tượng đã yêu thích ngay trên thẻ sản phẩm.
- Cập nhật con số sản phẩm yêu thích ở phần đầu trang.
- Mở một trang riêng để xem lại toàn bộ sản phẩm đã lưu.
- Lấy lại thông tin mới nhất của sản phẩm như tên, ảnh, giá và trạng thái bán.
- Đi từ danh sách yêu thích sang trang chi tiết để chọn biến thể và mua.
- Thành viên giữ danh sách theo tài khoản; khách chưa đăng nhập vẫn có thể lưu tạm trên thiết bị.

**Ví dụ:** khách đang tham khảo nhiều chiếc váy có thể bấm trái tim để so sánh sau, thay vì phải nhớ hoặc mở nhiều tab.

**Giá trị thực tế:** giữ lại ý định mua chưa hoàn tất và tạo lý do để khách quay lại website.

### 8.2. Giới hạn chức năng

- Danh sách của khách chưa đăng nhập chỉ tồn tại trên trình duyệt hiện tại và có thể mất khi xóa dữ liệu trình duyệt.
- Việc gộp danh sách khách vào tài khoản phụ thuộc luồng đăng nhập cụ thể, chưa đảm bảo trong mọi trường hợp.
- Chưa có nhiều danh sách riêng, chia sẻ danh sách hoặc thông báo khi giảm giá/có hàng trở lại.

### 8.3. Cách hoạt động phía sau

- Thành viên dùng API `/api/user/wishlist`; các ID sản phẩm được lưu trong hồ sơ người dùng rồi lấy thông tin mới nhất từ bảng sản phẩm.
- Khách dùng `LocalStorage` với khóa `velura_guest_wishlist`.
- Backend loại ID trùng và chỉ nhận sản phẩm hợp lệ đang bán.

---

## 9. Giỏ hàng

### 9.1. Định vị chức năng & phạm vi

Giỏ hàng là nơi người dùng chuẩn bị danh sách trước khi thanh toán. Người dùng có thể:

- Thêm một biến thể cụ thể, ví dụ “Áo linen — đen — size M”.
- Thêm nhiều thành phần của một combo sau khi đã chọn đủ màu/size.
- Tăng hoặc giảm số lượng.
- Xóa sản phẩm khỏi giỏ.
- Chọn một phần sản phẩm để thanh toán thay vì bắt buộc mua toàn bộ giỏ.
- Xem tổng tiền dự kiến của các mục đã chọn.
- Nhận cảnh báo khi sản phẩm hết hàng hoặc số lượng yêu cầu vượt tồn.
- Nhìn thấy số lượng sản phẩm trong giỏ ở phần đầu trang.
- Tiếp tục dùng giỏ sau khi chuyển trang.
- Sau khi đăng nhập, dữ liệu giỏ khách có thể được gộp với giỏ thành viên.

**Giá trị thực tế:** khách có thể mua trước rồi mới đăng nhập, giảm rào cản trong hành trình. Thành viên có thể quay lại sau và tiếp tục với giỏ đã lưu.

### 9.2. Giới hạn chức năng

- Giỏ khách chỉ nằm trên thiết bị hiện tại, không đồng bộ sang điện thoại hoặc máy tính khác.
- Giỏ thành viên lưu danh sách item dưới dạng một khối JSON; cách này đơn giản nhưng khó phân tích từng dòng giỏ khi dữ liệu lớn.
- Mỗi lần đồng bộ có thể gửi lại toàn bộ danh sách, chưa có cơ chế xử lý xung đột mạnh khi hai tab hoặc hai thiết bị sửa cùng lúc.
- Việc thấy “còn hàng” trong giỏ không đồng nghĩa hàng đã được giữ riêng. Sản phẩm vẫn có thể hết trước lúc tạo đơn.

### 9.3. Cách hoạt động phía sau

- Khách dùng `LocalStorage` với khóa `velura_cart`.
- Thành viên dùng `GET/POST /api/user/cart` và dữ liệu được lưu trong bảng `cart`.
- Backend kiểm tra ID biến thể, tồn khả dụng và tự giảm số lượng nếu người dùng yêu cầu nhiều hơn tồn.
- Các item được chọn để thanh toán được chuyển sang bước tiếp theo bằng SessionStorage.

---

## 10. Voucher, đặt hàng và thanh toán

### 10.1. Định vị chức năng & phạm vi

Quy trình đặt hàng gồm các bước rõ ràng:

1. Người dùng chọn các sản phẩm muốn mua từ giỏ.
2. Nhập hoặc chọn địa chỉ giao hàng đã lưu.
3. Chọn hình thức vận chuyển có trên giao diện.
4. Nhập voucher nếu có.
5. Hệ thống kiểm tra voucher còn hiệu lực, đơn có đủ giá trị tối thiểu và người dùng còn lượt sử dụng hay không.
6. Người dùng chọn COD, VNPay hoặc MoMo.
7. Hệ thống kiểm tra lại sản phẩm và tồn kho trước khi tạo đơn.
8. Sau khi hoàn tất, website hiển thị trang thành công hoặc thất bại.

Với thành viên, đơn được gắn trực tiếp vào tài khoản. Với khách chưa đăng nhập, website có luồng xác minh OTP rồi tạo hoặc chuẩn bị tài khoản để đơn có chủ sở hữu rõ ràng.

Nếu thanh toán online mô phỏng thất bại, người dùng có thể chọn chuyển đơn sang COD.

**Giá trị thực tế:** hỗ trợ cả khách và thành viên giúp giảm việc bắt buộc đăng ký quá sớm. Voucher được backend kiểm tra nên không chỉ là con số giảm giá do giao diện tự tính.

### 10.2. Giới hạn chức năng

- **VNPay và MoMo chưa phải thanh toán thật.** Trang `mock-payment.html` chỉ mô phỏng kết quả và gọi callback từ trình duyệt.
- Chưa tạo đường dẫn thanh toán từ nhà cung cấp, chưa xác minh chữ ký, chưa có webhook/IPN và đối soát giao dịch thật.
- Phí và phương thức giao hàng là quy tắc nội bộ, chưa lấy báo giá hoặc tạo vận đơn từ hãng vận chuyển.
- Việc tạo đơn, item, payment và trừ tồn diễn ra qua nhiều thao tác; source hiện chưa chứng minh toàn bộ được bọc trong một giao dịch cơ sở dữ liệu duy nhất. Nếu lỗi giữa chừng vẫn có nguy cơ dữ liệu chưa đồng bộ hoàn toàn.
- OTP của khách có phần lưu trong bộ nhớ tiến trình; khi server khởi động lại, phiên OTP đó có thể mất.

### 10.3. Cách hoạt động phía sau

- API voucher kiểm tra thời gian, số lượt tổng, số lượt mỗi người, đơn tối thiểu và mức giảm tối đa.
- Dữ liệu tạm giữa các bước checkout được giữ trong LocalStorage và SessionStorage.
- Thành viên tạo đơn qua `POST /api/user/orders`.
- Khách dùng API gửi và xác minh OTP của đơn hàng.
- COD nằm trong phạm vi hoạt động thật của hệ thống nội bộ; VNPay/MoMo chỉ mô phỏng trạng thái.

**Cách trình bày khi bảo vệ:** “Hệ thống đã hoàn thiện quy trình checkout, kiểm tồn, voucher, tạo đơn và COD. VNPay/MoMo mới mô phỏng giao diện và trạng thái, chưa kết nối môi trường của nhà cung cấp.”

---

## 11. Quản lý và theo dõi đơn hàng

### 11.1. Định vị chức năng & phạm vi

Sau khi mua, thành viên có thể tự phục vụ mà không cần hỏi CSKH cho mọi vấn đề:

- Xem danh sách các đơn đã đặt, sắp theo thời gian.
- Mở chi tiết để xem sản phẩm, số lượng, giá, địa chỉ, tổng tiền và phương thức thanh toán.
- Xem trạng thái hiện tại như chờ xác nhận, chuẩn bị, đang giao, đã giao, hoàn thành hoặc đã hủy.
- Xem mã theo dõi nếu đơn đã được gắn mã.
- Tra cứu bằng mã đơn hoặc mã theo dõi trong các luồng được hỗ trợ.
- Hủy đơn khi đơn chưa đi quá giai đoạn cho phép.
- Xác nhận đã nhận hàng hoặc hoàn tất khi backend cho phép.
- Từ đơn đã giao, đi tới chức năng đánh giá sản phẩm.
- Từ đơn đủ điều kiện, đi tới chức năng yêu cầu đổi/trả.

**Giá trị thực tế:** người dùng chủ động kiểm tra và xử lý sau mua; doanh nghiệp giảm số câu hỏi lặp lại gửi đến CSKH.

### 11.2. Giới hạn chức năng

- Không theo dõi vị trí kiện hàng theo thời gian thực vì chưa kết nối hãng vận chuyển.
- Hàm tự động chuyển trạng thái theo thời gian hiện đang bị tắt; trạng thái phụ thuộc thao tác admin hoặc các hành động khác.
- Tra cứu đơn khách bằng mã đơn/tracking chưa có lớp xác minh bổ sung mạnh như OTP cho mọi trường hợp.
- Chưa có hóa đơn điện tử hoặc xuất hóa đơn VAT.

### 11.3. Cách hoạt động phía sau

- Danh sách đơn của thành viên yêu cầu đăng nhập và backend kiểm tra đơn có thuộc người đó hay không.
- Backend chỉ cho phép một số chuyển trạng thái hợp lệ, không để người dùng tự đặt trạng thái tùy ý.
- Khi hủy đúng điều kiện, hệ thống có logic hoàn lại tồn kho.
- Một số sự kiện đơn hàng tạo thông báo cho người dùng.

---

## 12. Đăng ký, đăng nhập và quản lý phiên

### 12.1. Định vị chức năng & phạm vi

Hệ thống hỗ trợ nhiều tình huống tài khoản:

- Đăng ký bằng email hoặc số điện thoại.
- Kiểm tra email/số điện thoại đã được dùng hay chưa.
- Kiểm tra mật khẩu có đủ độ dài và các nhóm ký tự cần thiết.
- Xác minh OTP để kích hoạt hoặc tiếp tục một số luồng đăng nhập/khôi phục.
- Đăng nhập bằng email hoặc số điện thoại và mật khẩu.
- Quên mật khẩu, nhận OTP và đặt mật khẩu mới.
- Đăng nhập xã hội qua Supabase Auth, hiện có luồng Google/nhà cung cấp được hỗ trợ.
- Sau khi đăng nhập, phần đầu trang đổi sang trạng thái thành viên và mở khu vực tài khoản.
- Khi đăng xuất hoặc token hết hạn, dữ liệu phiên nhạy cảm được xóa.
- Dữ liệu tạm của khách như Style Quiz, giỏ hàng và một số yêu thích có thể được chuyển/gộp sau đăng nhập.

**Ví dụ:** một khách đã chọn sản phẩm và làm Style Quiz trước khi đăng ký không nhất thiết phải bắt đầu lại hoàn toàn sau khi đăng nhập.

**Giá trị thực tế:** hỗ trợ cả đăng nhập truyền thống và xã hội, đồng thời giữ tính liên tục giữa trải nghiệm khách và thành viên.

### 12.2. Giới hạn và rủi ro

- Mật khẩu tự xây dựng đang băm bằng SHA-256 một vòng và không có salt; chưa an toàn như Argon2id, bcrypt hoặc Supabase Auth hoàn chỉnh.
- Backend còn chấp nhận một số mã OTP dành cho demo/test như `123456` và có luồng `000000`; mã OTP cũng có thể được ghi log. Không được xem đây là cơ chế production.
- Token được lưu trong LocalStorage nên có rủi ro nếu website bị chèn mã JavaScript độc hại.
- Token custom hết hạn nhưng chưa có hệ thống refresh, xoay khóa và thu hồi phiên hoàn chỉnh.
- Hệ thống chấp nhận cả token Supabase và token Velura tự tạo, làm cơ chế đăng nhập phức tạp hơn.
- Chưa có xác thực hai lớp, quản lý thiết bị hoặc khóa đăng nhập khi thử sai nhiều lần một cách hoàn chỉnh.

### 12.3. Cách hoạt động phía sau

- Sau khi đăng nhập, trình duyệt lưu token và thông tin user để dùng cho các trang tiếp theo.
- `api.js` tự gắn token vào yêu cầu API.
- Backend có API đăng ký, đăng nhập, OTP, đặt lại mật khẩu và social login.
- Khi nhận token, backend thử xác minh Supabase trước rồi mới dùng cơ chế token custom dự phòng.

**Cách trình bày khi bảo vệ:** “Luồng tài khoản đủ để chứng minh nghiệp vụ guest/member, nhưng mật khẩu và OTP tự xây đang ở mức đồ án. Nếu production hóa, nhóm sẽ dùng Supabase Auth toàn phần hoặc Argon2id, bỏ toàn bộ mã OTP demo và chuyển sang cơ chế lưu phiên an toàn hơn.”

---

## 13. Hồ sơ cá nhân và địa chỉ giao hàng

### 13.1. Định vị chức năng & phạm vi

Thành viên có một khu vực tài khoản tập trung. Người dùng có thể:

- Xem và cập nhật họ tên, ngày sinh, giới tính và ảnh đại diện.
- Lưu nhiều địa chỉ giao hàng để không phải nhập lại ở mỗi lần mua.
- Chọn địa chỉ mặc định trên giao diện.
- Xem các khu vực liên quan như đơn hàng, yêu thích, Style Profile và ưu đãi.
- Dùng ngày sinh cho ưu đãi sinh nhật nếu có.
- Dùng dữ liệu hồ sơ và Style Profile làm đầu vào cho cá nhân hóa.

**Ví dụ:** sau khi lưu địa chỉ nhà và ngày sinh, lần checkout sau người dùng chỉ cần chọn địa chỉ; Offers Center cũng có thể nhận biết điều kiện sinh nhật.

**Giá trị thực tế:** giảm thời gian nhập liệu khi mua lại và tạo một nguồn thông tin thống nhất cho checkout, ưu đãi và AI.

### 13.2. Giới hạn chức năng

- Không đổi email hoặc số điện thoại trực tiếp trong API cập nhật hồ sơ.
- Các địa chỉ được lưu chung trong một mảng JSON của user, chưa có bảng địa chỉ riêng để quản lý lịch sử và phiên bản từng địa chỉ.
- Chưa yêu cầu xác minh lại danh tính khi đổi một số thông tin nhạy cảm.
- Chưa có trung tâm quản lý đồng ý sử dụng dữ liệu hoặc công cụ tải/xóa toàn bộ dữ liệu cá nhân.

### 13.3. Cách hoạt động phía sau

- API hồ sơ không trả password hash hoặc OTP cho giao diện.
- Backend kiểm tra độ dài tên, tính hợp lệ của ngày sinh và giá trị giới tính.
- API địa chỉ kiểm tra số điện thoại rồi cập nhật danh sách địa chỉ trong hồ sơ user.

---

## 14. Style Quiz và Hồ sơ phong cách

### 14.1. Định vị chức năng & phạm vi

Style Quiz là bảng câu hỏi giúp chuyển sở thích của người dùng thành dữ liệu có thể sử dụng cho việc tư vấn. Quiz có thể hỏi:

- Người dùng cần trang phục cho dịp nào: đi làm, đi chơi, dự tiệc hoặc nhu cầu khác.
- Nhóm tuổi.
- Chiều cao, cân nặng và một số số đo cơ thể.
- Dáng người và tông da do người dùng tự xác định.
- Phong cách yêu thích, ví dụ thanh lịch, tối giản hoặc cá tính.
- Màu sắc, thương hiệu và khoảng ngân sách.
- Kích thước thường mặc.

Trong quá trình làm quiz, người dùng có thể:

- Đi tới hoặc quay lại giữa các bước.
- Bỏ qua một số câu không bắt buộc.
- Xem lại bản tóm tắt trước khi hoàn tất.
- Làm lại để cập nhật sở thích.
- Nếu là thành viên, tải lại hồ sơ ở lần truy cập sau.
- Nếu là khách, làm quiz trước rồi chuyển dữ liệu vào tài khoản sau khi đăng nhập.

**Các chức năng sử dụng Style Profile:** bộ lọc catalog, trang gợi ý AI, gợi ý màu/size trên trang chi tiết và ngữ cảnh cho chatbot.

**Giá trị thực tế:** thay vì yêu cầu AI đoán từ một câu rất ngắn, hệ thống có dữ liệu có cấu trúc về phong cách, dáng người, màu và ngân sách để đưa ra gợi ý sát hơn.

### 14.2. Giới hạn chức năng

- Dáng người và số đo do người dùng tự nhập, không được nhận diện tự động từ ảnh.
- Gợi ý chỉ phục vụ thời trang, không phải kết luận y khoa hoặc may đo chuyên nghiệp.
- Hồ sơ của khách được lưu tạm ở trình duyệt và bộ nhớ server; có thể mất khi server khởi động lại hoặc người dùng đổi thiết bị trước khi đăng nhập.
- Chưa lưu lịch sử các phiên bản Style Profile.
- Chưa có bước xin đồng ý riêng cho việc lưu số đo cơ thể.

### 14.3. Cách hoạt động phía sau

- Mỗi bước quiz được giữ tạm trong SessionStorage; bản hoàn tất của khách được lưu trong LocalStorage.
- Giao diện gửi một mã phiên khách để backend phân biệt các khách chưa đăng nhập.
- Thành viên được thêm hoặc cập nhật một dòng `style_profile` trong database.
- Sau đăng nhập, API migrate hợp nhất dữ liệu guest vào hồ sơ thành viên.
- Các lựa chọn có nhiều giá trị như phong cách, dịp và màu được lưu dưới dạng danh sách.

---

## 15. AI Personalization — Gợi ý sản phẩm và phối set đồ

### 15.1. Định vị chức năng & phạm vi

Đây là một trong những chức năng tạo khác biệt chính của Velura. Hệ thống không chỉ hiển thị “sản phẩm nổi bật” giống nhau cho mọi người mà sử dụng Style Profile để tạo danh sách phù hợp hơn.

Người dùng có thể nhận:

- Danh sách sản phẩm đơn được chọn theo phong cách, dáng người, dịp sử dụng, màu và ngân sách.
- Sản phẩm được chia theo nhóm như áo, quần, váy hoặc phụ kiện để dễ xem.
- Tối đa 5 set đồ; mỗi set gồm 2–4 sản phẩm có thật trong catalog.
- Tên set và lời giải thích vì sao set đó phù hợp.
- Tổng giá dự kiến của set.
- Một cửa sổ chi tiết hiển thị từng món trong combo gợi ý.
- Đường dẫn tới từng sản phẩm để chọn màu/size.
- Khả năng thêm cả set vào giỏ khi đã xác định được các biến thể hợp lệ.

**Ví dụ dễ hiểu:** nếu hồ sơ cho biết người dùng thích phong cách tối giản, cần đồ đi làm, chuộng màu trung tính và có ngân sách 2 triệu, hệ thống sẽ ưu tiên những sản phẩm mang các đặc điểm này. AI chỉ được phép phối từ danh sách sản phẩm có thật mà backend đã cung cấp.

**Giá trị thực tế:** giảm thời gian tự phối đồ, hỗ trợ người không tự tin về thời trang và tăng khả năng khách mua nhiều món có thể dùng cùng nhau.

### 15.2. Giới hạn chức năng

- Gợi ý tốt hay không phụ thuộc việc sản phẩm đã được gắn đúng phong cách, dịp, dáng người, màu, size và embedding.
- Hệ thống chưa học tự động từ lượt bấm, thêm giỏ, mua hoặc đổi trả để điều chỉnh trọng số theo thời gian.
- Chưa có A/B test hoặc báo cáo chứng minh AI làm tăng tỷ lệ mua bao nhiêu phần trăm.
- Lời giải thích do AI tạo có thể mang tính tư vấn ngôn ngữ, không phải kết luận của chuyên gia may mặc.
- Set AI tạo ra chỉ tồn tại trong kết quả gợi ý; nó không tự tạo thành một mã combo/SKU có thể quản trị trong database.
- Khi dịch vụ AI lỗi, hệ thống dùng quy tắc dự phòng; kết quả vẫn có nhưng có thể kém tinh tế hơn.

### 15.3. Cách hoạt động phía sau — giải thích từng bước

1. Backend đọc Style Profile của thành viên hoặc khách.
2. Hệ thống chuẩn bị sẵn kết quả dự phòng dựa trên các quy tắc chấm điểm.
3. Hồ sơ được chuyển thành một đoạn mô tả gồm dáng người, tông da, phong cách, dịp, màu, thương hiệu, ngân sách, chiều cao và cân nặng.
4. Gemini Embedding chuyển mô tả này thành một dãy số 1.536 chiều. Có thể hiểu đây là “dấu vân tay về ý nghĩa” của nhu cầu.
5. PostgreSQL với `pgvector` tìm các sản phẩm có dấu vân tay ý nghĩa gần nhất.
6. Kết quả tiếp tục được chấm điểm bằng quy tắc kinh doanh:
   - sản phẩm gần về ý nghĩa được cộng điểm;
   - trùng phong cách được cộng nhiều điểm;
   - phù hợp dáng người, tông da và dịp được cộng thêm;
   - nằm trong ngân sách và là sản phẩm nổi bật cũng được ưu tiên.
7. Tối đa 24 sản phẩm tốt nhất được gửi cho Gemini cùng Style Profile.
8. Gemini chỉ chọn ID trong danh sách này và trả dữ liệu theo mẫu cố định gồm tên set, lý do và 2–4 ID sản phẩm.
9. Backend loại mọi ID lạ, kiểm tra set có ít nhất hai món, tính tổng giá rồi mới gửi cho giao diện.

Đây là mô hình kết hợp ba lớp:

- **Tìm theo ý nghĩa:** tìm sản phẩm gần với nhu cầu bằng embedding/vector.
- **Chấm điểm theo nghiệp vụ:** ưu tiên các tín hiệu như phong cách, dáng người và ngân sách.
- **AI phối và diễn giải:** Gemini chọn các món trong danh sách hợp lệ để tạo set và lý do.

Nếu AI không hoạt động, hệ thống dùng cách chấm điểm theo quy tắc để vẫn trả sản phẩm.

**Cách trình bày khi bảo vệ:** “AI không tự bịa sản phẩm. Backend tìm sản phẩm thật phù hợp trước, chấm điểm theo hồ sơ, sau đó mới cho Gemini phối các ID hợp lệ thành set đồ.”

---

## 16. AI Chatbot tư vấn viên

### 16.1. Định vị chức năng & phạm vi

Chatbot hoạt động như một điểm hỗ trợ chung cho cả khám phá sản phẩm và chăm sóc khách hàng. Khách hoặc thành viên có thể:

- Nhắn câu hỏi bằng văn bản, ví dụ “Tôi cần đồ đi tiệc dưới 2 triệu”.
- Gửi một ảnh thời trang để Gemini Vision nhận xét và tìm hướng phối phù hợp.
- Hỏi về sản phẩm, giá, màu, size và tồn kho.
- Hỏi về chính sách đổi trả, giao hàng hoặc nội dung bài viết.
- Với thành viên, hỏi về trạng thái đơn hàng trong phạm vi backend cho phép.
- Nhận câu trả lời có tiêu đề, danh sách, chữ đậm và liên kết dễ đọc.
- Nhận các thẻ sản phẩm bên dưới câu trả lời, có ảnh, giá và nút mở chi tiết.
- Nhận thẻ bài viết khi câu trả lời liên quan tới nội dung tư vấn.
- Lưu nhiều cuộc trò chuyện, mở lại lịch sử hoặc xóa phiên.
- Lưu outfit yêu thích; thành viên có thể đồng bộ sản phẩm sang wishlist.
- Yêu cầu gặp nhân viên CSKH nếu không muốn tiếp tục với AI.
- Sau khi nhân viên tiếp nhận, xem phản hồi của người thật trong cùng khu chat.

**Ví dụ:** người dùng hỏi “Mình dáng quả lê, cần set đi làm màu trung tính”. Chatbot lấy Style Profile nếu có, tìm sản phẩm thật phù hợp, trả lời bằng lời tư vấn và hiển thị các thẻ sản phẩm để người dùng mở xem ngay.

**Giá trị thực tế:** thay vì phải tìm riêng sản phẩm, chính sách và nút liên hệ, người dùng có thể bắt đầu từ một câu hỏi tự nhiên. Thẻ sản phẩm tạo đường đi trực tiếp từ tư vấn sang mua hàng.

### 16.2. Giới hạn chức năng

- Tin nhắn của nhân viên được kiểm tra định kỳ bằng polling, chưa đẩy tức thời bằng WebSocket.
- AI vẫn có thể trả lời sai. Việc cung cấp dữ liệu thật và giới hạn sản phẩm làm giảm rủi ro nhưng không loại bỏ hoàn toàn.
- Luồng Gemini chủ yếu nhận ngữ cảnh đã chuẩn bị sẵn; luồng Mistral dự phòng sử dụng công cụ theo cách rõ hơn.
- Khi tìm kiếm AI lỗi, hệ thống chuyển sang tìm theo từ khóa nên kết quả có thể kém chính xác về ý nghĩa.
- Ảnh tối đa khoảng 10 MB và được gửi dưới dạng dữ liệu base64; không phù hợp nhiều ảnh hoặc ảnh rất lớn.
- Chưa có kiểm virus riêng cho ảnh; việc hiểu ảnh phụ thuộc dịch vụ Gemini.
- Không có nhập/xuất giọng nói.
- Câu trả lời không hiện từng chữ theo thời gian thực; người dùng chờ AI tạo xong toàn bộ.
- Lịch sử của khách gắn với mã lưu trong trình duyệt, không đi theo khách sang thiết bị khác.
- Liên kết do model tạo cần cơ chế kiểm tra URL mạnh hơn trước khi production.

### 16.3. Cách hoạt động phía sau — giải thích dễ hiểu

Trước khi hỏi AI, backend chuẩn bị một “gói thông tin” gồm:

- một phần lịch sử trò chuyện gần nhất;
- Style Profile nếu người dùng có;
- các sản phẩm thật có khả năng liên quan;
- chính sách và bài viết liên quan;
- thông tin thành viên hoặc khách;
- các quy tắc yêu cầu AI không được bịa giá, tồn kho, sản phẩm hoặc chính sách.

Để tìm dữ liệu liên quan, hệ thống ưu tiên embedding/vector search. Nếu cách này không có kết quả hoặc gặp lỗi, backend tìm theo tên, SKU, mô tả và từ khóa.

Gemini trả về phần văn bản. Backend đối chiếu những tên hoặc ID sản phẩm được nhắc tới với danh sách sản phẩm đã tìm được, sau đó gửi cả câu trả lời và danh sách ID cho giao diện. Giao diện dùng ID đó để dựng thẻ sản phẩm.

Nếu Gemini lỗi hoặc chưa có khóa API, hệ thống thử Mistral. Nếu cả hai dịch vụ đều không hoạt động, chatbot dùng câu trả lời dự phòng theo loại câu hỏi và dữ liệu đã tìm thấy.

Khi nhận thấy người dùng muốn gặp người thật, hệ thống:

1. Tạo một phiếu hỗ trợ.
2. Chuyển trạng thái phiên chat sang chờ CSKH.
3. Có thể đưa email cảnh báo vào hàng đợi gửi thư.
4. Tạm ngừng bot trong lúc nhân viên đang tiếp nhận.

---

## 17. Đánh giá sản phẩm

### 17.1. Định vị chức năng & phạm vi

Hệ thống đánh giá được gắn với việc mua hàng thật:

- Chỉ thành viên có đơn đã giao hoặc hoàn thành mới được đánh giá sản phẩm trong đơn.
- Người dùng chọn số sao, viết nhận xét, chọn thẻ mô tả và có thể gửi ảnh.
- Mỗi sản phẩm trong một đơn chỉ được đánh giá một lần; nếu review bị từ chối, hệ thống có thể cho gửi lại theo luồng hiện tại.
- Review được kiểm tra trước khi hiển thị công khai.
- Trang chi tiết sản phẩm chỉ hiện những review đã được duyệt.
- Người dùng hoặc admin có thể phản hồi trong khả năng giao diện/API hỗ trợ.
- Người dùng có thể nhận thông báo review được duyệt hoặc bị từ chối trong một số luồng.

**Giá trị thực tế:** yêu cầu đã mua hàng làm tăng độ tin cậy so với review ẩn danh. Nội dung review giúp khách sau đánh giá chất lượng và độ phù hợp trước khi mua.

### 17.2. Giới hạn chức năng

- Kiểm duyệt tự động hiện dựa trên danh sách từ cấm, chuỗi quảng cáo và tên file; chưa phải AI hiểu nội dung hoặc ảnh.
- Cách kiểm tra từ khóa có thể chặn nhầm hoặc bị né bằng cách viết biến thể.
- Phản hồi được lưu trong một trường JSON/string thay vì bảng hội thoại riêng.
- Chưa có nút “hữu ích”, báo cáo lạm dụng, lịch sử chỉnh sửa hoặc phát hiện review gian lận.

### 17.3. Cách hoạt động phía sau

- Backend kiểm tra tài khoản có sở hữu đơn và trạng thái đơn đủ điều kiện trước khi tạo review.
- Review ban đầu ở trạng thái chờ, sau đó được kiểm tra từ khóa để duyệt hoặc từ chối.
- API chi tiết sản phẩm chỉ trả review `approved`.

---

## 18. Yêu cầu đổi trả và hoàn tiền

### 18.1. Định vị chức năng & phạm vi

Khi đơn đủ điều kiện, thành viên có thể:

- Chọn đơn cần xử lý.
- Chọn từng sản phẩm trong đơn và số lượng muốn đổi/trả.
- Chọn loại yêu cầu: hoàn tiền hoặc đổi hàng.
- Chọn lý do và nhập mô tả chi tiết.
- Tải ảnh bằng chứng nếu cần.
- Gửi yêu cầu để nhân viên kiểm tra.
- Xem danh sách và trạng thái các yêu cầu đã gửi.
- Xem mã theo dõi hàng hoàn nếu hệ thống đã tạo/gắn mã.
- Hủy yêu cầu khi trạng thái còn cho phép.

Backend kiểm tra:

- người gửi có phải chủ đơn hay không;
- đơn có đúng trạng thái và còn trong thời hạn cho phép hay không;
- sản phẩm có thực sự thuộc đơn hay không;
- tổng số lượng đã yêu cầu trước đó cộng với lần này có vượt số lượng đã mua hay không.

**Ví dụ:** khách mua hai áo nhưng đã trả một áo trước đó thì lần tiếp theo chỉ có thể yêu cầu tối đa một áo còn lại.

**Giá trị thực tế:** quy trình hậu mãi trở thành dữ liệu có cấu trúc, có trạng thái và bằng chứng, thay vì xử lý hoàn toàn qua tin nhắn rời rạc.

### 18.2. Giới hạn chức năng

- Chưa tự tạo nhãn gửi hàng hoặc đặt đơn lấy hàng với hãng vận chuyển.
- “Hoàn tiền” mới cập nhật thông tin/trạng thái nội bộ, chưa gọi API hoàn tiền thật của VNPay/MoMo.
- User chỉ gửi yêu cầu; admin vẫn là người duyệt hoặc từ chối.
- Chưa có tranh chấp nhiều cấp, SLA tự động hoặc cách tính hoàn tiền phức tạp theo nhiều loại phí.

### 18.3. Cách hoạt động phía sau

- API đổi trả yêu cầu thành viên đăng nhập.
- Dữ liệu chính được ghi vào `return_exchange`; từng sản phẩm được ghi trong `return_item`.
- Ảnh bằng chứng đi qua API upload và Storage.
- Phần duyệt hoàn tiền/tạo đơn đổi nằm ở backend và Admin Web.

---

## 19. Blog, chính sách và các trang nội dung

### 19.1. Định vị chức năng & phạm vi

Website có khu vực nội dung để hỗ trợ cả việc mua hàng và xây dựng thương hiệu:

- Xem danh sách bài viết theo danh mục.
- Ưu tiên bài nổi bật và chia trang danh sách bài.
- Mở bài viết bằng đường dẫn dễ đọc theo `slug`.
- Trong bài viết có thể hiển thị các phần nội dung phong phú và sản phẩm liên quan.
- Xem các tab chính sách như giao hàng, đổi trả hoặc quyền riêng tư.
- Xem trang giới thiệu lấy nội dung từ hệ thống.
- Khi dịch vụ nội dung lỗi, blog và trang giới thiệu có thể dùng nội dung dự phòng để tránh màn hình trắng.

**Giá trị thực tế:** bài viết tạo cảm hứng và hỗ trợ SEO; chính sách giúp khách hiểu điều kiện mua hàng; chatbot cũng có thể dùng kho nội dung này để trả lời.

### 19.2. Giới hạn chức năng

- Dữ liệu blog dự phòng là một khối nội dung viết sẵn khá lớn trong frontend và có thể khác với nội dung database.
- User Web không có chức năng quản trị nội dung.
- Chưa có bình luận bài viết, lưu bài, theo dõi lượt chia sẻ hoặc đề xuất theo lịch sử đọc.
- Trang blog chưa có công cụ tìm kiếm mạnh riêng; việc tìm nội dung chủ yếu được chatbot hỗ trợ.

### 19.3. Cách hoạt động phía sau

- API content trả danh mục, bài viết, chính sách và trang giới thiệu.
- Backend chỉ trả nội dung đã ở trạng thái xuất bản.
- `content.js` ưu tiên dữ liệu API; `blog-posts.js` chứa nội dung dự phòng và cách dựng bài chi tiết.

---

## 20. Ưu đãi, voucher, banner và thông báo

### 20.1. Định vị chức năng & phạm vi

Khu ưu đãi giúp người dùng hiểu “tôi đang dùng được ưu đãi nào?” thay vì chỉ thấy một danh sách voucher chung:

- Phân loại ưu đãi thành đang dùng được, bị khóa, đã dùng, hết hạn hoặc chưa đến ngày.
- Kết hợp dữ liệu voucher, đơn hàng và hồ sơ để xác định trạng thái.
- Hiển thị ưu đãi sinh nhật khi người dùng đã cung cấp ngày sinh và đủ điều kiện.
- Chọn banner theo một số trạng thái như đã đăng nhập, có hàng trong giỏ, có wishlist, đã làm quiz hoặc đã dùng chatbot.
- Hiển thị danh sách thông báo.
- Đánh dấu một thông báo hoặc toàn bộ thông báo là đã đọc.

**Ví dụ:** thành viên có sinh nhật trong thời gian phù hợp có thể thấy banner sinh nhật được ưu tiên hơn banner chung. Người đã có sản phẩm trong giỏ có thể thấy lời nhắc quay lại hoàn tất mua hàng.

**Giá trị thực tế:** nhắc đúng thời điểm giúp khách quay lại, hiểu quyền lợi và tăng khả năng sử dụng voucher.

### 20.2. Giới hạn chức năng

- Nội dung và cách chấm điểm banner A1–A6 phần lớn được viết sẵn ở frontend, chưa phải hệ thống marketing tự quyết định dựa trên dữ liệu lớn.
- Một số thao tác lưu ưu đãi, giới thiệu bạn bè và loyalty còn dựa trên trạng thái cục bộ, chưa có sổ điểm thưởng hoàn chỉnh.
- Khi bảng thông báo lỗi hoặc chưa có dữ liệu, API có thể trả thông báo mẫu; thao tác đánh dấu đã đọc có thể báo thành công dự phòng nhưng không lưu thật.
- Chưa có push notification, tùy chọn nhận email hoặc hệ thống lên lịch chiến dịch hoàn chỉnh.

### 20.3. Cách hoạt động phía sau

- API offers kết hợp voucher, đơn và hồ sơ user.
- `hot-banner-slider.js` chứa danh sách banner và quy tắc cộng điểm theo trạng thái người dùng.
- `monthly-offers.js` xử lý popup, ngày sinh, giới thiệu bạn bè và trạng thái lưu cục bộ.
- API notifications đọc bảng thông báo, sắp xếp mới nhất trước và có phương án dự phòng.

---

## 21. Form liên hệ và các hỗ trợ trải nghiệm

### 21.1. Định vị chức năng & phạm vi

Form liên hệ hiện giúp người dùng nhập dữ liệu đúng định dạng:

- Nhập họ tên, email, số điện thoại, chủ đề và nội dung.
- Nhận thông báo lỗi ngay tại trường nhập nếu thiếu hoặc sai định dạng.
- Nhận thông báo thành công trên giao diện khi form hợp lệ.

Website còn có các tiện ích chung:

- Header, footer và đường dẫn điều hướng thống nhất giữa các trang.
- Menu và bộ lọc thích ứng trên điện thoại.
- Tab, thư viện ảnh, chọn số lượng và điều khiển video.
- Popup khi người dùng sắp rời trang, chọn nội dung dựa trên giỏ hàng, wishlist, quiz hoặc chat trong phiên.

**Giá trị thực tế:** giảm lỗi nhập liệu và tạo trải nghiệm nhất quán trên nhiều màn hình/kích thước thiết bị.

### 21.2. Giới hạn chức năng

- Form liên hệ chưa gọi API, chưa tạo ticket và chưa gửi email. Thông báo thành công hiện chỉ là phản hồi giao diện.
- Vì chưa có backend nên cũng chưa có CAPTCHA hoặc giới hạn spam cho form.
- Popup rời trang chỉ dựa trên quy tắc phía trình duyệt, chưa có nhóm thử nghiệm để đo hiệu quả.
- Có một số hỗ trợ bàn phím và ARIA nhưng chưa có báo cáo kiểm thử WCAG toàn diện.

### 21.3. Cách hoạt động phía sau

- `contact-form.js` ngăn gửi form mặc định, kiểm tra dữ liệu, hiện thông báo rồi đặt lại form.
- `exit-intent.js` đọc LocalStorage/SessionStorage để chọn thông điệp và tránh hiện lặp quá nhiều trong cùng phiên.

---

## 22. Những câu nên và không nên nói khi bảo vệ

| Chủ đề | Nên nói | Không nên nói |
|---|---|---|
| Dữ liệu | “Catalog, tài khoản, giỏ thành viên, đơn, review và đổi trả dùng dữ liệu thật qua API.” | “Mọi nội dung trên website đều hoàn toàn động.” |
| Search | “Search thường tìm và chấm điểm trên catalog thật ở trình duyệt.” | “Thanh search dùng AI và hiểu mọi lỗi chính tả.” |
| AI gợi ý | “Hệ thống tìm sản phẩm thật, chấm điểm rồi cho Gemini phối set.” | “AI tự tạo ra sản phẩm hoặc combo bán hàng mới.” |
| Chatbot | “Chatbot có dữ liệu sản phẩm/chính sách, thẻ sản phẩm và chuyển CSKH.” | “Chat hoàn toàn realtime và AI không thể trả lời sai.” |
| Thanh toán | “COD và tạo đơn nằm trong phạm vi; VNPay/MoMo là mô phỏng.” | “Đã tích hợp thanh toán VNPay/MoMo thật.” |
| Vận chuyển | “Hệ thống lưu phương thức và mã theo dõi.” | “Đã kết nối và theo dõi realtime từ hãng vận chuyển.” |
| Review | “Review đã mua hàng và được kiểm tra từ khóa.” | “Review được AI kiểm duyệt.” |
| Auth | “Luồng đăng ký/đăng nhập hoạt động ở mức đồ án.” | “Mật khẩu và OTP đã đạt chuẩn production.” |
| Xu hướng | “Trending là nội dung định hướng được cấu hình sẵn.” | “Trending tự học từ lịch sử tìm kiếm.” |

---

## 23. Các câu hỏi hội đồng có thể đặt ra

### 23.1. Search của hệ thống có phải AI không?

> “Thanh search thông thường chưa phải AI. Nó tải catalog thật, chuẩn hóa tiếng Việt và chấm điểm theo mức trùng tên/danh mục. Tìm kiếm theo ý nghĩa bằng embedding chỉ được dùng trong AI Personalization và Chatbot.”

### 23.2. AI có bịa sản phẩm không?

> “Backend tìm danh sách sản phẩm thật trước rồi chỉ gửi các ID đó cho Gemini. Sau khi AI trả kết quả, backend loại mọi ID không nằm trong danh sách ứng viên. Vì vậy AI không được phép tạo ID sản phẩm mới.”

### 23.3. Nếu Gemini bị lỗi thì website có dùng được không?

> “Có. Hệ thống đã tạo sẵn kết quả dự phòng bằng quy tắc chấm điểm. Chatbot cũng thử Mistral và cuối cùng dùng câu trả lời dự phòng. Chất lượng có thể giảm nhưng chức năng không dừng hoàn toàn.”

### 23.4. Giỏ của khách và thành viên khác nhau thế nào?

> “Giỏ khách lưu trên trình duyệt nên chỉ có ở thiết bị đó. Giỏ thành viên lưu trong database nên có thể dùng lại sau. Khi đăng nhập, hệ thống có luồng gộp dữ liệu khách vào tài khoản.”

### 23.5. Hệ thống đã thanh toán thật chưa?

> “COD và việc tạo đơn là thật trong phạm vi hệ thống. VNPay/MoMo chỉ mô phỏng màn hình và trạng thái, chưa có chữ ký, webhook và đối soát từ nhà cung cấp.”

### 23.6. Tại sao cần Style Quiz nếu đã có chatbot?

> “Quiz tạo dữ liệu có cấu trúc và dùng lại ở nhiều nơi: bộ lọc, trang chi tiết, AI gợi ý và chatbot. Chatbot giúp hỏi linh hoạt, còn Style Profile giúp câu trả lời nhất quán và không phải hỏi lại mọi thông tin.”

### 23.7. Đổi trả có hoàn tiền vào tài khoản khách ngay không?

> “Chưa. User Web tạo yêu cầu và admin xử lý trạng thái nội bộ. Việc gọi API hoàn tiền thật của cổng thanh toán nằm ngoài phạm vi hiện tại.”

---

## 24. Việc cần làm nếu đưa lên production

### Ưu tiên 1 — An toàn và tính đúng đắn

1. Chuyển toàn bộ đăng nhập sang Supabase Auth hoặc dùng Argon2id; xóa mã OTP demo và không ghi OTP ra log.
2. Dùng cơ chế lưu phiên an toàn hơn và tách khóa JWT khỏi service-role key.
3. Gom tạo đơn, item, payment và trừ tồn vào một giao dịch có khả năng chống gửi lặp.
4. Tích hợp cổng thanh toán thật với chữ ký và webhook.
5. Thêm giới hạn request riêng cho đăng nhập, OTP, checkout và upload chat.

### Ưu tiên 2 — Khả năng phục vụ dữ liệu lớn

1. Chuyển tìm kiếm, lọc và chia trang catalog xuống backend.
2. Tách cart item, địa chỉ và phản hồi review thành bảng riêng.
3. Lưu OTP, quiz khách và trạng thái phiên quan trọng trong Redis/database thay vì bộ nhớ tiến trình.
4. Dùng WebSocket hoặc SSE cho chat CSKH nếu cần cập nhật tức thời.
5. Chia các file JavaScript quá lớn thành module nhỏ theo chức năng.

### Ưu tiên 3 — Đo lường hiệu quả

1. Ghi nhận từ khóa tìm kiếm, kết quả rỗng, bộ lọc đã dùng và sản phẩm được bấm.
2. Đo người dùng đã nhìn, bấm, thêm giỏ và mua từ gợi ý AI.
3. Thử nghiệm A/B cho banner, thứ tự sản phẩm và prompt chatbot.
4. Dùng đánh giá và đổi trả để cải thiện gợi ý kích thước/phong cách.

---

## 25. Bản đồ source code làm bằng chứng

| Chức năng | Giao diện | Backend |
|---|---|---|
| Gọi API và phiên đăng nhập | `api.js`, `auth-session.js` | `server.js`, `rbac.js` |
| Search và catalog | `search-overlay.js`, `product-catalog.js` | `apps/api/src/user/products.js` |
| Chi tiết và giỏ hàng | `options.js`, `cart.js` | `apps/api/src/user/cart.js`, `orders.js` |
| Đăng nhập và hồ sơ | `auth-client.js`, `account-profile.js` | `apps/api/src/user/auth.js`, `profile.js` |
| Style Quiz và gợi ý AI | `style-quiz.js`, `ai-suggestions.js` | `quiz.js`, `recommendation-service.js`, `gemini-client.js` |
| Chatbot | `chatbot.js` | `chatbot-service.js`, `chatbot-repository.js`, `llm-service.js` |
| Đánh giá và đổi trả | `product-review.js`, `return-request.js` | `reviews.js`, `returns.js` |
| Nội dung và ưu đãi | `content.js`, `blog-posts.js`, `offers-center.js` | `content-service.js`, `offers.js`, `notifications.js` |

---

## 26. Kết luận bảo vệ

Velura User Web không chỉ là bộ giao diện minh họa. Hệ thống đã kết nối phần lớn hành trình mua sắm với API và cơ sở dữ liệu chung: sản phẩm, tài khoản, giỏ thành viên, đơn hàng, đánh giá, đổi trả, nội dung và AI.

Điểm nổi bật nhất là cách AI được giới hạn bằng dữ liệu thật. Hệ thống tìm sản phẩm phù hợp trước, chấm điểm bằng hồ sơ phong cách, sau đó mới dùng Gemini để phối set và diễn giải. Chatbot cũng lấy sản phẩm, chính sách và bài viết liên quan trước khi tạo câu trả lời, đồng thời có đường chuyển sang nhân viên CSKH.

Các giới hạn lớn nhất là thanh toán và vận chuyển thật, bảo mật mật khẩu/OTP, tính nguyên tử của tạo đơn và tồn kho, tìm kiếm dữ liệu lớn, chat thời gian thực và đo lường hiệu quả. Vì vậy, cách định vị phù hợp nhất là:

> **Velura là một đồ án thương mại điện tử end-to-end có chiều sâu nghiệp vụ và AI, đã dùng dữ liệu thật ở phần lớn chức năng, nhưng vẫn cần tăng cường bảo mật và tích hợp dịch vụ ngoài trước khi vận hành như một hệ thống thương mại điện tử production hoàn chỉnh.**
