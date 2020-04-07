# ----------------------------------------
# HEY YOU! YEAH YOU! THE ONE READING THIS!
# ----------------------------------------
# Interested in demoscene on linux? join us in
# the Linux Sizecoding channel! #lsc on IRCNET!
# ----------------------------------------

# notes on the build system:
# ~$ uname -a
# Linux stardrifter 5.4.0-0.bpo.2-amd64 #1 SMP Debian 5.4.8-1~bpo10+1 (2020-01-07) x86_64 GNU/Linux
# ~$ gcc -dumpversion
# 8
# ~$ nasm --version
# NASM version 2.14
# ~$ lzma --version
# xz (XZ Utils) 5.2.4
# liblzma 5.2.4
# ~$ dpkg-query --showformat='${Version}' --show libglib2.0-dev
# 2.58.3-2+deb10u2
# ~$ dpkg-query --showformat='${Version}' --show libgtk-3-dev:amd64
# 3.24.5-1
# ~$ dpkg-query --showformat='${Version}' --show mesa-common-dev:amd64
# 18.3.6-2+deb10u1



#huge greets to donnerbrenn!
CFLAGS = -Os -s -march=nocona -std=gnu11

CFLAGS+= -fno-plt
CFLAGS+= -fno-stack-protector -fno-stack-check
CFLAGS+= -fno-unwind-tables -fno-asynchronous-unwind-tables -fno-exceptions
CFLAGS+= -funsafe-math-optimizations -ffast-math
CFLAGS+= -fomit-frame-pointer
CFLAGS+= -ffunction-sections -fdata-sections
CFLAGS+= -fmerge-all-constants
CFLAGS+= -fno-PIC -fno-PIE
CFLAGS+= -malign-data=cacheline
CFLAGS+= -mno-fancy-math-387 -mno-ieee-fp
CFLAGS+= -Wall
CFLAGS+= -Wextra
CFLAGS+= -no-pie
#use with gcc7+:
CFLAGS+=-flto

CFLAGS+= -nostartfiles -nodefaultlibs
CFLAGS+= `pkg-config --cflags gtk+-3.0`
CFLAGS+= -lc
CFLAGS+= -lGL
CFLAGS+= -lglib-2.0
CFLAGS+= -lgobject-2.0
CFLAGS+= -lgtk-3
CFLAGS+= -lgdk-3

CFLAGS+= -Wl,--build-id=none
CFLAGS+= -Wl,-z,norelro
CFLAGS+= -Wl,-z,nocombreloc
CFLAGS+= -Wl,--gc-sections
CFLAGS+= -Wl,-z,nodynamic-undefined-weak
CFLAGS+= -Wl,--no-ld-generated-unwind-info
CFLAGS+= -Wl,--no-eh-frame-hdr
CFLAGS+= -Wl,-z,noseparate-code
CFLAGS+= -Wl,--hash-style=sysv
CFLAGS+= -Wl,--whole-archive
CFLAGS+= -Wl,--print-gc-sections
CFLAGS+=-T linker.ld

.PHONY: clean check_size

all : access_control check_size

packer : vondehi/vondehi.asm 
	cd vondehi; nasm -fbin -o vondehi vondehi.asm

shader.frag.min : shader.frag Makefile
	cp shader.frag shader.frag.min

shader.h : shader.frag.min Makefile
	mono ./shader_minifier.exe shader.frag.min -o shader.h

access_control.elf : access_control.c shader.h linker.ld Makefile
	gcc -o $@ $< $(CFLAGS)

access_control_unpacked : access_control_opt.elf
	mv $< $@

access_control : access_control_opt.elf.packed
	mv $< $@

#all the rest of these rules just takes a compiled elf file and generates a packed version of it with vondehi
%_opt.elf : %.elf Makefile
	cp $< $@
	strip -R .crap $@

	#remove section header
	./Section-Header-Stripper/section-stripper.py $@

	#clear out useless bits
	sed -i 's/_edata/\x00\x00\x00\x00\x00\x00/g' $@;
	sed -i 's/__bss_start/\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00/g' $@;
	sed -i 's/_end/\x00\x00\x00\x00/g' $@;

	chmod +x $@

%.xz : % Makefile
	-rm $@
	lzma --format=lzma -9 --extreme --lzma1=preset=9,lc=0,lp=0,pb=0,nice=51 --keep --stdout $< > $@
# 	./nicer.py $< -o $@

%.packed : %.xz packer Makefile
	cat ./vondehi/vondehi $< > $@
	chmod +x $@

clean :
	-rm *.elf *.xz shader.h access_control access_control_unpacked

check_size :
	./sizelimit_check.sh