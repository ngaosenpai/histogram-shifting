# **Yêu cầu:**
- Máy có cài nodejs

# **Cách start:**
-   Sau khi pull code về
-   Chạy lệnh: `npm i`
-   Sau khi các package đã install xong
-   Chạy lệnh: `npm run start:dev`
-   Mở trình duyệt ở: `localhost:3000`

# **Cách sử dụng:**
## Encrypt:
-   Tải ảnh lên
-   Nhập secret message
-   Click: `Hide`
-   Lưu lại secret key để sử dụng khi muốn decrypt (ngay dưới preview)
-   Ảnh sẽ đc tải về máy với tên: `embeded-Tên_ảnh_cũ`

## Decrypt:
-   Tải ảnh embeded lên
-   Click `Get secret message`
-   Điền secret key vào trong prompt
-   Click `OK`
-   Message sẽ được hiện ra trên 1 pop up
-   Ảnh sẽ được recovery lại và lưu về máy với tên `origin-Tên_ảnh_cũ`

# **Các hình minh họa histogram:**
## Chú ý:
Hình minh họa có chiều rộng 512px và chiều cao 200px chính vì thế nếu message quá ngắn và sự chênh lệch giữa peakPoint và những mức màu khác quá lớn thì sẽ rất khó có thể nhìn thấy sự thay đổi **(có 1 vùng trống được sinh ra sau khi shifting ngay cạnh peakPoint)**

-   hình 1 cho ta thấy histogram ban đầu của ảnh
-   hình 2 cho ta thấy histogram sau khi shift
-   hình 3 cho ta thấy histogram sau khi embeded
-   hình 4 cho ta thấy histogram của ảnh embed lúc được tải lên
-   hình 5 cho ta thấy histogram sau khi đc recovery

# **Chú ý:**
-   Thuật toán dựa trên việc shifting histogram của bức ảnh, tức là thay đổi giá trị pixel trên ảnh
-   Các tương tác này hoạt động trên `bitmap`, và khi ảnh được tải về, tùy vào định dạng ảnh mà sẽ sử dụng các kĩ thuật nén ảnh riêng để lưu vào máy.
-   Định dạng `png` sử dụng kĩ thuật nén ảnh ko làm mất mát dữ liệu
-   Định dạng `jpg` sử dụng kĩ thuật nén ảnh làm mất mát dữ liệu.
-   Chính vì thế khi nén và giải nén định dạng `jpg` sẽ có sự thay đổi về giá trị trong `bitmap`. Điều này dẫn đến mất mát dữ liệu mà ta cần.
-   **Vì lẽ đó chương trình sẽ không hoạt động chính xác nếu sử dụng định dạng `jpg`.** 