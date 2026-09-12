# Experimento anterior de simulação de tecido no Blender 5.2 (preservado para referência).
# A camiseta publicada agora é preparada por scripts/prepare-shirt.mjs; veja docs/studio-3d.md.
#
# Como funciona (mesma lógica de uma camiseta costurada):
#   1. Painéis frente e costas são recortados de uma silhueta plana (tam. M da tabela: 52 cm de
#      largura, 70 cm de altura, manga 24 cm) e costurados nos ombros, laterais e mangas; gola,
#      barra e punhos ficam abertos. A gola frontal é mais baixa que a das costas.
#   2. Um manequim invisível (tronco, quadril, pescoço, ombros e braços; ~35 cm de tronco) infla de
#      5% a 100% dentro da peça sem gravidade; depois a gravidade entra e o tecido assenta com
#      dobras naturais. Ombros e gola ficam presos (como se estivessem no cabide).
#   3. O resultado vira a malha "Tee"; a gola canelada "Collar" é um tubo ao redor da abertura.
#   4. UVs por projeção inteligente; materiais Principled portáveis para glTF.
#
# Uso local:  blender -b -P scripts/blender/tee-cloth-sim.py -- saida.glb
#   (depois: npx @gltf-transform/cli optimize saida.glb dist/assets/tee.glb --compress quantize
#            --texture-compress false --prune-attributes false)
# Foi rodado originalmente no 3D Jutsu (Blender 5.2 headless), que exporta o GLB da cena.
import bpy, bmesh, math, sys, time
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt

t0 = time.time()
scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
FR_END = 72
scene.frame_start = 1; scene.frame_end = FR_END; scene.render.fps = 24

def bez(p0, p1, p2, p3, n):
    out = []
    for i in range(n):
        t = i / n; u = 1 - t
        out.append((u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
                    u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]))
    return out
def line(p0, p1, n):
    return [(p0[0] + (p1[0]-p0[0])*i/n, p0[1] + (p1[1]-p0[1])*i/n) for i in range(n)]

# ---- silhueta plana (metade direita), metros, vista frontal (x, z); hem em z=0 ----
N=(0.085,0.700); S=(0.235,0.655); T=(0.410,0.485); C=(0.278,0.380); A=(0.255,0.490)
B=(0.262,0.300); H=(0.260,0.028); Hc=(0.240,0.0); M=(0.0,0.0)
pieces = [  # (pontos, aberto?, nome)
    (bez(N,(0.14,0.692),(0.19,0.672),S,12), False, 'shoulder'),
    (bez(S,(0.30,0.60),(0.37,0.53),T,14), False, 'sleevetop'),
    (line(T,C,12), True, 'cuff'),
    (bez(C,(0.27,0.43),(0.255,0.46),A,9), False, 'sleeveunder'),
    (bez(A,(0.256,0.44),(0.26,0.36),B,14), False, 'side1'),
    (bez(B,(0.263,0.20),(0.263,0.08),H,16), False, 'side2'),
    (bez(H,(0.258,0.008),(0.25,0.0),Hc,4), True, 'hemcorner'),
    (line(Hc,M,16), True, 'hem'),
]
right = []; right_name = []
for pts, op, nm in pieces:
    for p in pts:
        right.append(p); right_name.append(nm)
shared = list(right) + [M]; shared_name = list(right_name) + ['hem']
shared += [(-p[0], p[1]) for p in reversed(right)]; shared_name += list(reversed(right_name))
n_shared = len(shared)
Np = (-0.085, 0.700)
neck_front = bez(Np,(-0.072,0.655),(-0.04,0.632),(0,0.630),9)[1:] + bez((0,0.630),(0.04,0.632),(0.072,0.655),N,9)
neck_back  = bez(Np,(-0.058,0.686),(-0.03,0.679),(0,0.677),7)[1:] + bez((0,0.677),(0.03,0.679),(0.058,0.686),N,7)
outline_f = shared + neck_front
outline_b = shared + neck_back

def inside(pt, poly):
    x, y = pt; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i+1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi: c = not c
    return c
def dist_boundary(pt, poly):
    px, py = pt; best = 1e9; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i+1) % n]
        dx, dy = x2-x1, y2-y1; L2 = dx*dx+dy*dy
        t = 0 if L2 == 0 else max(0, min(1, ((px-x1)*dx + (py-y1)*dy)/L2))
        qx, qy = x1 + t*dx, y1 + t*dy
        d = (px-qx)**2 + (py-qy)**2
        if d < best: best = d
    return math.sqrt(best)

SP = 0.0105  # espaçamento da malha (m)
def panel(outline):
    pts = list(outline)
    xs = [p[0] for p in outline]; zs = [p[1] for p in outline]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    nx = int((x1-x0)/SP); nz = int((z1-z0)/SP)
    for i in range(1, nx):
        for j in range(1, nz):
            p = (x0 + i*SP + (SP*0.5 if j % 2 else 0), z0 + j*SP*0.94)
            if inside(p, outline) and dist_boundary(p, outline) > SP*0.62:
                pts.append(p)
    n_out = len(outline)
    res = delaunay_2d_cdt([Vector(p) for p in pts], [(i, (i+1) % n_out) for i in range(n_out)], [list(range(n_out))], 1, 1e-7)
    vco, vfaces, orig = res[0], res[2], res[3]
    in2out = {}; out_input = {}
    for oi, origs in enumerate(orig):
        for ii in origs:
            in2out[ii] = oi
            if ii < n_out: out_input[oi] = ii
    return vco, vfaces, in2out, out_input

vf, ff, in2out_f, outin_f = panel(outline_f)
vb, fb, in2out_b, outin_b = panel(outline_b)

def spread(x, z):  # abertura do decote em 3D (frente/costas se afastam perto do pescoço)
    zf = max(0.0, min(1.0, (z-0.56)/0.06))
    xf = max(0.0, 1 - (abs(x)/0.105)**2)
    return 0.062 * zf * xf

verts = []; fmap = {}; shared_global = {}
for oi, v in enumerate(vf):
    ii = outin_f.get(oi, -1)
    is_shared = (0 <= ii < n_shared)
    y = 0.0 if is_shared else -0.012 - spread(v.x, v.y)
    verts.append((v.x, y, v.y)); fmap[oi] = len(verts)-1
    if is_shared: shared_global[ii] = fmap[oi]
bmap = {}
for oi, v in enumerate(vb):
    ii = outin_b.get(oi, -1)
    if 0 <= ii < n_shared:
        bmap[oi] = shared_global[ii]  # costura: vértice compartilhado
    else:
        verts.append((v.x, 0.012 + spread(v.x, v.y), v.y)); bmap[oi] = len(verts)-1
faces = [[fmap[i] for i in f] for f in ff] + [[bmap[i] for i in reversed(f)] for f in fb]

me = bpy.data.meshes.new('TeeSim'); me.from_pydata(verts, [], faces); me.validate(); me.update()
tee = bpy.data.objects.new('TeeSim', me); scene.collection.objects.link(tee)
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
front_face = None
for f in bm.faces:
    c = f.calc_center_median()
    if c.y < -0.005 and abs(c.x) < 0.05 and 0.3 < c.z < 0.45: front_face = f; break
if front_face is not None and front_face.normal.y > 0:
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
bm.to_mesh(me); bm.free(); me.update()
for p in me.polygons: p.use_smooth = True

nf = len(outline_f); nb = len(outline_b)
f_neck = [fmap[in2out_f[i]] for i in range(n_shared, nf)]
b_neck = [bmap[in2out_b[i]] for i in range(n_shared, nb)]
pin_ids = [shared_global[i] for i in range(n_shared) if shared_name[i] == 'shoulder' and i in shared_global]
pin_ids += f_neck + b_neck + [shared_global[0], shared_global[n_shared-1]]
pin_ids = sorted(set(pin_ids))
vg = tee.vertex_groups.new(name='pin'); vg.add(pin_ids, 1.0, 'REPLACE')

# ---- manequim invisível (colisão), infla de 5% a 100% ----
mann = []
def add_part(name, bmfunc, loc, rot=None):
    bmp = bmesh.new(); bmfunc(bmp)
    m = bpy.data.meshes.new(name); bmp.to_mesh(m); bmp.free()
    o = bpy.data.objects.new(name, m); scene.collection.objects.link(o)
    o.location = loc
    if rot is not None:
        o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot
    o.modifiers.new('Collision', 'COLLISION')
    o.collision.thickness_outer = 0.006; o.collision.cloth_friction = 10.0; o.collision.damping = 0.6
    o.hide_render = True
    mann.append(o); return o
def ellipsoid(sx, sy, sz):
    def f(b):
        bmesh.ops.create_uvsphere(b, u_segments=28, v_segments=18, radius=1.0)
        for v in b.verts: v.co = Vector((v.co.x*sx, v.co.y*sy, v.co.z*sz))
    return f
def cone(r_bottom, r_top, L, sy=1.0):
    def f(b):
        bmesh.ops.create_cone(b, cap_ends=True, cap_tris=False, segments=28, radius1=r_bottom, radius2=r_top, depth=L)
        if sy != 1.0:
            for v in b.verts: v.co = Vector((v.co.x, v.co.y*sy, v.co.z))
    return f
add_part('M_torso', ellipsoid(0.175, 0.110, 0.30), (0, 0, 0.36))
add_part('M_hips', cone(0.185, 0.165, 0.42, sy=0.62), (0, 0, 0.12))  # quadril um pouco mais largo embaixo: a barra cai em volta
add_part('M_neck', cone(0.045, 0.045, 0.24), (0, 0, 0.72))
for sgn in (1, -1):
    add_part('M_shoulder_%d' % sgn, ellipsoid(0.07, 0.072, 0.06), (sgn*0.145, 0, 0.60))
    J = Vector((sgn*0.17, 0, 0.62)); E = Vector((sgn*0.379, 0, 0.397))  # eixo do braço = eixo da manga
    d = (E - J); q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    add_part('M_arm_%d' % sgn, cone(0.047, 0.047, d.length), (J + E) / 2, q)
for o in mann:
    for f, s in ((1, 0.05), (18, 1.0), (FR_END, 1.0)):
        o.scale = (s, s, s); o.keyframe_insert(data_path='scale', frame=f)

# ---- tecido ----
cm = tee.modifiers.new('Cloth', 'CLOTH')
st = cm.settings
st.quality = 6; st.mass = 0.22
st.tension_stiffness = 14; st.compression_stiffness = 14; st.shear_stiffness = 4; st.bending_stiffness = 0.2
st.tension_damping = 5; st.compression_damping = 5; st.shear_damping = 5; st.bending_damping = 0.7
st.air_damping = 1.8
st.vertex_group_mass = 'pin'; st.pin_stiffness = 1.0
cs = cm.collision_settings
cs.use_collision = True; cs.distance_min = 0.005; cs.collision_quality = 3; cs.friction = 8
cs.use_self_collision = True; cs.self_distance_min = 0.0045; cs.self_friction = 6
cm.point_cache.frame_start = 1; cm.point_cache.frame_end = FR_END
ew = st.effector_weights  # gravidade só depois do manequim inflar
for f, g in ((1, 0.0), (17, 0.0), (26, 1.0), (FR_END, 1.0)):
    ew.gravity = g; tee.keyframe_insert(data_path='modifiers["Cloth"].settings.effector_weights.gravity', frame=f)

t1 = time.time()
for f in range(1, FR_END + 1):
    scene.frame_set(f)
t2 = time.time()

# ---- aplica o resultado, suaviza e monta a gola ----
dg = bpy.context.evaluated_depsgraph_get()
me2 = bpy.data.meshes.new_from_object(tee.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
me2.name = 'Tee'
final = bpy.data.objects.new('Tee', me2); scene.collection.objects.link(final)
bm = bmesh.new(); bm.from_mesh(me2)
inner = [v for v in bm.verts if not v.is_boundary]
for _ in range(2): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.45, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me2); bm.free(); me2.update()
for p in me2.polygons: p.use_smooth = True

loop_ids = [shared_global[n_shared-1]] + f_neck + [shared_global[0]] + list(reversed(b_neck))
pts3 = [me2.vertices[i].co.copy() for i in loop_ids]
cd = bpy.data.curves.new('CollarCurve', 'CURVE'); cd.dimensions = '3D'
sp = cd.splines.new('NURBS'); sp.points.add(len(pts3)-1)
for i, p in enumerate(pts3): sp.points[i].co = (p.x, p.y, p.z, 1.0)
sp.use_cyclic_u = True; sp.order_u = 4; sp.resolution_u = 6
cd.bevel_depth = 0.0068; cd.bevel_resolution = 5; cd.use_fill_caps = False
cobj = bpy.data.objects.new('CollarCurve', cd); scene.collection.objects.link(cobj)
dg = bpy.context.evaluated_depsgraph_get()
me3 = bpy.data.meshes.new_from_object(cobj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
me3.name = 'Collar'; collar = bpy.data.objects.new('Collar', me3); scene.collection.objects.link(collar)
for p in me3.polygons: p.use_smooth = True
bpy.data.objects.remove(cobj, do_unlink=True)

def mat(name, col, rough, sheen):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = col; b.inputs['Roughness'].default_value = rough
    try: b.inputs['Sheen Weight'].default_value = sheen
    except Exception: pass
    return m
final.data.materials.append(mat('Cotton', (0.93, 0.93, 0.91, 1), 0.86, 0.35))
collar.data.materials.append(mat('Rib', (0.90, 0.90, 0.88, 1), 0.80, 0.4))

bpy.data.objects.remove(tee, do_unlink=True)
for o in mann: bpy.data.objects.remove(o, do_unlink=True)

try:
    for o in scene.objects: o.select_set(False)
    final.select_set(True); bpy.context.view_layer.objects.active = final
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
except Exception as e:
    print('UV smart_project falhou:', e)

# Uso local: exporta o GLB no caminho passado após "--".
if '--' in sys.argv:
    out = sys.argv[sys.argv.index('--') + 1]
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_apply=True)
    print('GLB salvo em', out)

print('Tee: %d vértices, %d faces; gola: %d faces; simulação %.1fs; total %.1fs' % (
    len(me2.vertices), len(me2.polygons), len(me3.polygons), t2 - t1, time.time() - t0))
