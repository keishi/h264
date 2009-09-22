OBJS = main.o h264_stream.o h264_nal_unit.o h264_parse.o
CC = gcc
DEBUG = -g
CFLAGS = -Wall -c $(DEBUG)
LFLAGS = -Wall $(DEBUG)

h264 : $(OBJS) all_tests
	$(CC) $(LFLAGS) $(OBJS) -o h264

main.o : main.c
	$(CC) $(CFLAGS) main.c

h264_stream.o : h264_stream.h h264_stream.c
	$(CC) $(CFLAGS) h264_stream.c

CuTest.o: CuTest.h CuTest.c
	$(CC) $(CFLAGS) CuTest.c

test_h264_stream.o: test_h264_stream.h test_h264_stream.c
	$(CC) $(CFLAGS) test_h264_stream.c

all_tests.o: all_tests.c
	$(CC) $(CFLAGS) all_tests.c

all_tests: h264_stream.o test_h264_stream.o all_tests.o
	$(CC) $(LFLAGS) CuTest.o h264_stream.o test_h264_stream.o all_tests.o -o all_tests

h264_nal_unit.o : h264_nal_unit.h h264_nal_unit.c
	$(CC) $(CFLAGS) h264_nal_unit.c

h264_parse.o : h264_parse.h h264_parse.c
	$(CC) $(CFLAGS) h264_parse.c

clean:
	\rm *.o h264
