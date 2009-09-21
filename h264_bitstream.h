#ifndef H264_BITSTREAM_H
#define H264_BITSTREAM_H

#include "util.h"

typedef struct h264_bitstream_t {
    uint8_t *data;
    uint32_t size;
    int bit_pos;
    int byte_pos;
} h264_bitstream_t;

h264_bitstream_t *h264_bitstream_new(uint8_t *data, int size);
void h264_bitstream_free(h264_bitstream_t *bs);
uint32_t h264_bitstream_read(h264_bitstream_t *bs, uint32_t n);
uint32_t h264_bitstream_peek(h264_bitstream_t *bs, uint32_t n);
int h264_bitstream_bits_remaining(h264_bitstream_t *bs);

#endif