#version 420
out vec4 fragCol;

float linedist(vec2 p, vec2 a, vec2 b) {
	float k = dot(p-a, b-a)/dot(b-a,b-a);
	return distance(p,mix(a,b,clamp(k,0.,1.)));
}

float scene(vec3 p) {
	float s = 1.25;
	float mx = 10000.;
	
	float fl = p.z+5.8;
	
	p.z += floor(p.y/s)*acos(.0);
	p.y = (fract(p.y/s)-0.5)*s;
	for (int i = -1; i <= 1;i++){
		vec3 g = p + vec3(0.,float(i)*s,float(i)*acos(0.));
		float d1 = linedist(g.xy, vec2(0,0.2),vec2(0,-0.2))-0.5;
		//greets to FabriceNeyret2 https://www.shadertoy.com/view/XsdBW8
		float d2 = abs(sin(atan(g.y,g.x)/2.-g.z)*min(1.,length(g.xy)));
		float d = length(vec2(d1,d2))/sqrt(2.)-0.05;
		mx = min(d,mx);
	}
	return min(max(mx,-fl),fl+0.6);
}

vec3 norm(vec3 p) {
	mat3 k = mat3(p,p,p) - mat3(0.001);
	return normalize(scene(p) - vec3(scene(k[0]),scene(k[1]),scene(k[2])) );
}


#define FK(k) floatBitsToInt(cos(k))^floatBitsToInt(k)
float hash(vec2 p) {
	int x = FK(p.x);int y = FK(p.y);
	return float((x*x+y)*(x-y*y)-x)/2.14e9;
}

vec2 hash2(vec2 p) {
	return vec2(hash(p+5.), hash(p));
}

float noise(vec2 p) {
	vec2 c = fract(p);
	p = floor(p);
	return mix(mix(hash(p),hash(p+vec2(1,0)),c.x),mix(hash(p+vec2(0,1)),hash(p+vec2(1,1)),c.x),c.y);
}

void main()
{
	vec2 uv_org = (gl_FragCoord.xy - vec2(960.0, 540.0))/1080;
	float border = max(max(abs(uv_org).x,abs(uv_org).y),0.43-abs(uv_org.y));
	vec3 bg = vec3(0.99)+noise(uv_org*1080.f*vec2(0.4,1))*0.02;
	if (border > 0.45) { fragCol.xyz=bg;return;}
	vec3 col = vec3(0.);
	float acc = 0.;
	for(float i = 0.; i < 1.; i+=0.2){
		for(float j = 0.; j < 1.; j+=0.2){
	acc+=1.;
	vec2 uv = uv_org+vec2(i,j)/1080.f;
	vec3 cam = normalize(vec3(1.6,uv));
	vec3 init = vec3(-35,0,0);
		
	vec2 mouse = vec2(4.1,3.12);
	mouse.xy += normalize(hash2(uv))*0.01;
	mat3 rot_x = mat3( cos(mouse.x), sin(mouse.x), 0.0,
					  -sin(mouse.x), cos(mouse.x), 0.0,
								0.0,		  0.0, 1.0);
	
	mat3 rot_y = mat3( cos(mouse.y), 0.0, sin(mouse.y),
								0.0, 1.0, 0.0,
					  -sin(mouse.y), 0.0, cos(mouse.y));
	if (uv.y < 0.0) {
		init*=rot_y*rot_x;
		cam*=rot_y*rot_x;
	}
	
	vec3 p = init;
	bool hit = false;
	for (int i = 0; i < 200; i++) {
		float dist = scene(p);
		if (dist*dist < 0.000001) { hit = true; break; }
		if (distance(p,init) > 100.) break;
		p += dist*cam;
	}

	vec3 n = norm(p);
	float fog = smoothstep(0.,100.,distance(p,init));
	float fakediff = length(sin(n*3.)*0.5+0.5)/sqrt(3.);
	float fakeref = pow(length(sin(reflect(cam,n)*4.)*0.5+0.5)/sqrt(3.),10.);
	col+= hit ? mix(fakediff*vec3(0.4,0.4,0.5) + fakeref*vec3(2.),vec3(0.1),fog) : vec3(0.1);
		}
	}
	fragCol.xyz = smoothstep(0.05,1.1,sqrt(col/acc))+vec3(hash2(uv_org*7.),hash(uv_org*9.)*2.)*0.03+noise(uv_org*1080.f/1.5)*0.03;

	fragCol.xyz = mix(fragCol.xyz, bg,smoothstep(0.4,0.4+3./1080.f,border));
}
