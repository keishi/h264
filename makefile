OBJS = main.o h264_bitstream.o h264_bytestream.o
CC = gcc
DEBUG = -g
CFLAGS = -Wall -c $(DEBUG)
LFLAGS = -Wall $(DEBUG)

h264 : $(OBJS)
	$(CC) $(LFLAGS) $(OBJS) -o h264

main.o : main.c
	$(CC) $(CFLAGS) main.c

h264_bitstream.o : h264_bitstream.h h264_bitstream.c
	$(CC) $(CFLAGS) h264_bitstream.c

h264_bytestream.o : h264_bytestream.h h264_bytestream.c
	$(CC) $(CFLAGS) h264_bytestream.c

clean:
	\rm *.o h264
