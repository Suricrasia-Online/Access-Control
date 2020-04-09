#version 420
uniform sampler2D tex;
out vec4 fragCol;

float linedist(float x, float y, float w) {
	return length(vec2(x, max(0.,abs(y)-w)));
}

float fksquare(vec3 p, vec3 d) {
	return max(linedist(p.x, p.z, d.z), linedist(p.x, p.y, d.y))-d.x;
}

vec3 erot(vec3 p, vec3 ax, float ro) {
	return mix(dot(ax, p)*ax, p, cos(ro)) + cross(ax,p)*sin(ro);
}

/*   DAVE HOSKINS' HASH FUNCTIONS (modified so it's between -1 and 1)  */
float hash(vec2 p){vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3,p3.yzx+19.19); return 2*fract((p3.x+p3.y)*p3.z)-1;}

int mat;
float scene(vec3 p) {
	if (p.z > 0.) {
		mat = 1;
		float s = 1.25;
		float mx = 10000.;

		p.z += floor(p.y/s)*acos(.0);
		p.y = (fract(p.y/s)-0.5)*s;
		for (int i = -1; i <= 1;i++){
			vec3 g = p + vec3(0.,float(i)*s,float(i)*acos(0.));
			float d1 = linedist(g.x, g.y, 0.2)-0.5;
			//greets to FabriceNeyret2 https://www.shadertoy.com/view/XsdBW8
			float d2 = abs(sin(atan(g.y,g.x)/2.-g.z)*min(1.,length(g.xy)));
			float d = length(vec2(d1,d2))/sqrt(2.)-0.05;
			mx = min(d,mx);
		}
		return mx;
	}
	else {
		p*=4.8;
		vec2 scale = vec2(14.5, 11);
		vec2 id = floor(p.yz/scale);
		p = vec3(p.x, (fract(p.yz/scale) - 0.5)*scale);

		float hs = hash(id);
		p.zx+=hash(id.xx+24.4)*0.8;
		float sides = fksquare(vec3(p.x+0.2,abs(p.y)-6.8,p.z), vec3(0.3,.3,10.));
		p = erot(p, vec3(1,0,0), hs*hs*hs*0.04);
		p = erot(p, vec3(0,0,1), hash(id+47.4)*hs*0.01);
		p.x+=hs*hs*0.3;
		float handle = linedist(linedist(min(p.x+.5,0.), p.y, 1.)-0.8, p.z+1.5, 0.25)-.1;
		float panel = fksquare(p, vec3(0.25,6.,5.));
		vec3 labelpos = vec3(0.2,0.,-1.);
		float label = max(fksquare(p+labelpos, vec3(0.2, 1.5, 1.)), -fksquare(p+labelpos, vec3(.5, 0.7, 0.5)));
		float keyhole = max(linedist(p.x+.4, length(p.yz+vec2(3.2,1.5)), 0.35)-0.05, -fksquare(p+vec3(.4, 3.2,1.5), vec3(.1, 0.03, 0.18)));
		float black = min(0.4-p.x, min(panel, sides));
		float silver = min(min(label, keyhole), handle*0.9);
		mat = silver < black ? 1 : 0;
		return min(black, silver)/4.8;
	}
}

vec3 norm(vec3 p) {
	mat3 k = mat3(p,p,p) - mat3(0.001);
	return normalize(scene(p) - vec3(scene(k[0]),scene(k[1]),scene(k[2])) );
}

vec2 hash2(vec2 p) {
	return vec2(hash(p*5.), hash(p));
}

float noise(vec2 p) {
	vec2 c = fract(p);
	p = floor(p);
	return mix(mix(hash(p),hash(p+vec2(1,0)),c.x),mix(hash(p+vec2(0,1)),hash(p+vec2(1,1)),c.x),c.y);
}

float scene_col(vec2 uv) {
	vec3 cam = normalize(vec3(1.6,uv));
	vec3 init = vec3(-35,0,uv.y>0.?3:-4.2);

	vec3 p = init;
	bool hit = false;
	for (int i = 0; i < 50; i++) {
		float dist = scene(p);
		if (dist*dist < 0.00001) { hit = true; break; }
		if (distance(p,init) > 100.) break;
		p += dist*cam;
	}

	int mymat = mat;
	vec3 n = norm(p);
	float ao = clamp((scene(p+n*0.1)+0.1)/.2, 0.,1.);
	float fakediff = length(sin(n*3.)*0.5+0.5)/sqrt(3.);
	float fakeref = pow(length(sin(reflect(cam,n)*4.)*0.5+0.5)/sqrt(3.),10.);
	float bright = uv.y>0?0.35:0.6;
	if (!hit) return 0.07;
	return mymat == 1 ? fakediff*bright + fakeref*1.5 : ao*fakediff*.15 + fakeref;
}

float pixel_col(vec2 coord) {
	vec2 uv = (coord - vec2(960.0, 540.0))/1080.0;
	float border = max(max(abs(uv).x,abs(uv).y),0.43-abs(uv.y));
	float bg = 0.99+noise(uv*1080.0*vec2(0.4,1))*0.02;
	if (border > 0.41) { return bg;}
	float col = 0.;
	float acc = 0.;
	for(float i = 0.; i < 1.; i+=0.25){
		for(float j = 0.; j < 1.; j+=0.25){
			acc+=1.;
			vec2 uv2 = uv+vec2(i,j)/1080.0;
			col += scene_col(uv2);
		}
	}
	col = smoothstep(0.05,1.1,sqrt(col/acc))+noise(uv*1080.0/1.5)*0.03;

	return mix(col, bg, smoothstep(0.4,0.4+3./1080.0,border));
}

void main()
{
	// algorithm stolen from the gimp oilify filter :3
	float hist[256];
	for (int i = 0 ; i < 256 ; i++ ) hist[i] = 0;
	float histmax = 0.;
	float rad = 2;

	for(float i = -rad; i <= rad; i+=1){
		for(float j = -rad; j <= rad; j+=1){
			vec2 off = vec2(i,j);
			if (length(off) > rad) continue;
			float samp = pow(clamp(pixel_col(gl_FragCoord.xy + off),0.,1.),2.);
			int pos = int(samp*254.);
			hist[pos] += 1.;
			histmax =max(histmax,hist[pos]);
		  }
	}
	float color = 0.;
	float acc = 0.;
	for (int i = 0; i < 255; i++ ){
		float weight = pow(hist[i]/histmax, 8.);
		color += (float(i)/255.) * weight;
		acc += weight;
	}
	
	fragCol = vec4(sqrt(color/acc))*pow(texture(tex, gl_FragCoord.xy/vec2(1920,-1080)).x,0.8);
}