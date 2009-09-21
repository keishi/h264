#include <stdlib.h>

#include "h264_bitstream.h"

h264_bitstream_t *h264_bitstream_new(uint8_t *data, int size)
{
    h264_bitstream_t *bs = malloc(sizeof(h264_bitstream_t));
    bs->data = data;
    bs->size = size;
    bs->bit_pos = 7;
    bs->byte_pos = 0;
    return bs;
}

void h264_bitstream_free(h264_bitstream_t *bs)
{
    free(bs->data);
    bs->size = 0;
    bs->bit_pos = 7;
    bs->byte_pos = 0;
}

uint32_t h264_bitstream_read(h264_bitstream_t *bs, uint32_t n)
{
    uint32_t ret = 0;
    
    if (n == 0) {
        return 0;
    }
    
    int i;
    for (i = 0; i < n && h264_bitstream_bits_remaining(bs) > 0; ++i) {
        uint8_t b = bs->data[bs->byte_pos];
        ret = ret << 1 | BITAT(b, bs->bit_pos);
        if (bs->bit_pos == 0) {
            bs->bit_pos = 7;
            bs->byte_pos++;
        } else {
            bs->bit_pos--;
        }
    }
    
    return ret;
}

uint32_t h264_bitstream_peek(h264_bitstream_t *bs, uint32_t n)
{
    int prev_bit_pos = bs->bit_pos;
    int prev_byte_pos = bs->byte_pos;
    uint32_t ret = h264_bitstream_read(bs, n);
    bs->bit_pos = prev_bit_pos;
    bs->byte_pos = prev_byte_pos;
    return ret;
}

int h264_bitstream_bits_remaining(h264_bitstream_t *bs)
{
    return (bs->size - bs->byte_pos) * 8 + bs->bit_pos;
}
