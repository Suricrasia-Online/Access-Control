#version 420
out vec4 fragCol;

void main() {
		// Normalized pixel coordinates (from -1 to 1)
		vec2 uv_base = (gl_FragCoord.xy - vec2(960.0, 540.0))/vec2(960.0, 960.0);

		fragCol = vec4(0.5, 0.2, 0.1, 1.0);
}