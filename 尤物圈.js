
var libapp = null;

function cpFromPP(pp, offset) {
    return pp.add(offset).readU32();
}

function hookFromJson(name, addr, patchFn) {
    Interceptor.attach(addr, {
        onEnter: function () {
            this.pp = this.context.x27;
            this.arg0_stack_addr = this.context.sp.add(8);
            this.saved_x0 = this.context.x0;
        },
        onLeave: function () {
            var objPtr = this.arg0_stack_addr.readPointer();
            if (objPtr.isNull()) {
                objPtr = this.saved_x0;
            }
            patchFn(objPtr, this.pp);
            console.log("[" + name + "] patched @" + objPtr);
        }
    });
}

function runHook() {
    libapp = Process.findModuleByName("libapp.so");
    if (!libapp) {
        setTimeout(runHook, 500);
        return;
    }

    console.log("libapp.so found at " + libapp.base);

    var UserInfoModel_fromJson = libapp.base.add(0x8ac1a4);
    var TokenModel_fromJson = libapp.base.add(0x598abc);
    var VideoDetailModel_fromJson = libapp.base.add(0x95183c);
    var LinesModel_fromJson = libapp.base.add(0x95306c);

    hookFromJson("UserInfoModel", UserInfoModel_fromJson, function (objPtr) {
        var vip = objPtr.add(0x1b).readU32();
        objPtr.add(0x1f).writeU32(vip);
        objPtr.add(0x23).writeU32(vip);
    });

    hookFromJson("TokenModel", TokenModel_fromJson, function (objPtr, pp) {
        var y = cpFromPP(pp, 0x78d0);
        objPtr.add(0x17).writeU32(y);
        objPtr.add(0x1b).writeU32(y);
        objPtr.add(0x1f).writeU32(y);
    });

    hookFromJson("VideoDetailModel", VideoDetailModel_fromJson, function (objPtr, pp) {
        var zero = cpFromPP(pp, 0x3af8);
        var empty = cpFromPP(pp, 0x2d8);

        objPtr.add(0x7b).writeU32(zero);   // pay_type
        objPtr.add(0x7f).writeU32(empty);  // layer_type
        objPtr.add(0x83).writeU32(zero);   // money
        objPtr.add(0x87).writeU32(zero);   // old_money
        objPtr.add(0x8b).writeU32(zero);   // rate
        objPtr.add(0x8f).writeU32(zero);   // balance
        objPtr.add(0xcf).writeU32(empty);  // play_tips
        objPtr.add(0xd7).writeU32(empty);  // buy_tips
    });

    hookFromJson("LinesModel", LinesModel_fromJson, function (objPtr, pp) {
        var zero = cpFromPP(pp, 0x3af8);
        objPtr.add(0xb).writeU32(zero);    // is_vip
    });
}

setImmediate(runHook);
