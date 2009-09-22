#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

#include "h264_bytestream.h"

h264_bytestream_t *h264_bytestream_new(uint8_t *data, int size)
{
    h264_bytestream_t *bs = malloc(sizeof(h264_bytestream_t));
    bs->data = data;
    bs->size = size;
    bs->pos = 0;
    return bs;
}

h264_bytestream_t *h264_bytestream_from_file(char *path)
{
    FILE *fp;
    long file_size;
    uint8_t *buffer;
    size_t result;

    fp = fopen(path, "rb");
    if (fp == NULL) {
        return NULL;
    }
    
    fseek(fp , 0 , SEEK_END);
    file_size = ftell(fp);
    rewind(fp);
    
    buffer = (uint8_t *)malloc(file_size);
    assert(buffer);
    
    result = fread(buffer, 1, file_size, fp);
    assert(result == file_size);
    
    fclose (fp);
    
    h264_bytestream_t *bs = h264_bytestream_new(buffer, file_size);
    
    return bs;
}

void h264_bytestream_free(h264_bytestream_t *bs)
{
    free(bs->data);
    bs->size = 0;
    bs->pos = 0;
}

uint32_t h264_bytestream_read(h264_bytestream_t *bs, uint32_t n)
{
    uint32_t ret = 0;
    
    if (n == 0) {
        return 0;
    }
    
    int i;
    for (i = 0; i < n && bs->pos < bs->size - 1; ++i) {
        uint8_t b = bs->data[bs->pos];
        ret = ret << sizeof(uint8_t) | b;
        bs->pos++;
    }
    
    return ret;
}

uint32_t h264_bytestream_peek(h264_bytestream_t *bs, uint32_t n)
{
    int prev_pos = bs->pos;
    uint32_t ret = h264_bytestream_read(bs, n);
    bs->pos = prev_pos;
    return ret;
}

int h264_bytestream_bytes_remaining(h264_bytestream_t *bs)
{
    return bs->size - bs->pos;
}

int h264_bytestream_more_data_left(h264_bytestream_t *bs)
{
    return bs->size > bs->pos;
}
