#ifndef H264_PARSE_H
#define H264_PARSE_H

h264_nal_unit_t *h264_byte_stream_nal_unit(h264_bytestream_t *bs);
h264_nal_unit_t *h264_nal_unit(h264_bytestream_t *bs);

#endif