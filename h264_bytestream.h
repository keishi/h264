#ifndef H264_BYTESTREAM
#define H264_BYTESTREAM

#include "util.h"

typedef struct h264_bytestream_t {
    uint8_t *data;
    uint32_t size;
    int pos;
} h264_bytestream_t;

h264_bytestream_t *h264_bytestream_new(uint8_t *data, int size);
h264_bytestream_t *h264_bytestream_from_file(char *path);
void h264_bytestream_free(h264_bytestream_t *bs);
uint32_t h264_bytestream_read(h264_bytestream_t *bs, uint32_t n);
uint32_t h264_bytestream_peek(h264_bytestream_t *bs, uint32_t n);
int h264_bytestream_bytes_remaining(h264_bytestream_t *bs);

#endif