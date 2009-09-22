h264_nal_unit_t *h264_byte_stream_nal_unit(h264_bytestream_t *bs)
{
    if () {
        return NULL;
    }
    h264_nal_unit_t *nu;
    while (h264_bytestream_bytes_peek(3) != 0x000001 && 
        h264_bytestream_bytes_peek(4) != 0x00000001) {
        assert(h264_bytestream_read(1) == 0x00); // leading_zero_8bits
    }
    if (h264_bytestream_bytes_peek(3) != 0x000001) {
        assert(h264_bytestream_read(1) == 0x00); // zero_byte
    }
    if (h264_bytestream_more_data_left(file_bs)) {
        assert(h264_bytestream_read(3) == 0x000001); // start_code_prefix_one_3bytes
        nu = h264_nal_unit(bs);
    }
    while (h264_bytestream_more_data_left(file_bs) &&
        h264_bytestream_bytes_peek(3) != 0x000001 && 
        h264_bytestream_bytes_peek(4) != 0x00000001) {
        assert(h264_bytestream_read(1) == 0x00); // trailing_zero_8bits
    }
    return nu;
}

h264_nal_unit_t *h264_nal_unit(h264_bytestream_t *bs)
{
    h264_nal_unit_t *nu = malloc(sizeof(h264_nal_unit_t));
    h264_bitstream_t 
    return nu;
}

