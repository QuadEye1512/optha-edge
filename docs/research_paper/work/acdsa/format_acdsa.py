from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy
from lxml import etree as E
import re, json, hashlib

HERE=Path(__file__).resolve().parent
TEMPLATE=Path(r'C:\Users\Faizan Shaikh\Downloads\ACDSA_template.docx')
SOURCE=HERE.parent.parent/'OpthaEdge_Research_Paper.docx'
OUT=HERE.parent.parent/'OpthaEdge_ACDSA_Research_Paper.docx'
W='http://purl.oclc.org/ooxml/wordprocessingml/main'
R='http://purl.oclc.org/ooxml/officeDocument/relationships'
OW='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
PR='http://schemas.openxmlformats.org/package/2006/relationships'
ns={'w':W}
def el(tag,**attrs):return E.Element('{'+W+'}'+tag,{'{'+W+'}'+k:str(v) for k,v in attrs.items()})
def sub(parent,tag,**attrs):
    e=el(tag,**attrs);parent.append(e);return e
def xml(e):return E.tostring(e,xml_declaration=True,encoding='UTF-8',standalone=True)
def txt(e):return ''.join(e.itertext()) if False else ''.join(e.xpath('.//*[local-name()="t"]/text()'))
def para(text='',style='BodyText',size=None,italic=False):
    p=el('p');pr=sub(p,'pPr');sub(pr,'pStyle',val=style)
    if text:
        r=sub(p,'r')
        if size or italic:
            rp=sub(r,'rPr')
            if italic:sub(rp,'i')
            if size:sub(rp,'sz',val=size*2)
        t=sub(r,'t');t.text=text;t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
    return p
def props(p):return p.find('w:pPr',ns)
def section_end(p,section):props(p).append(deepcopy(section))
def mapped(e):
    s=E.tostring(e).decode()
    for a,b in [
        ('http://schemas.openxmlformats.org/wordprocessingml/2006/main',W),
        ('http://schemas.openxmlformats.org/officeDocument/2006/relationships',R),
        ('http://schemas.openxmlformats.org/officeDocument/2006/math','http://purl.oclc.org/ooxml/officeDocument/math'),
        ('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','http://purl.oclc.org/ooxml/drawingml/wordprocessingDrawing'),
        ('http://schemas.openxmlformats.org/drawingml/2006/main','http://purl.oclc.org/ooxml/drawingml/main'),
        ('http://schemas.openxmlformats.org/drawingml/2006/picture','http://purl.oclc.org/ooxml/drawingml/picture')]:s=s.replace(a,b)
    return E.fromstring(s.encode())

with ZipFile(TEMPLATE) as z:package={n:z.read(n) for n in z.namelist()}
with ZipFile(SOURCE) as z:source={n:z.read(n) for n in z.namelist()}
root=E.fromstring(package['word/document.xml']);body=root.find('w:body',ns)
sections=root.findall('.//w:sectPr',ns)
title_sec=deepcopy(sections[0]);author_sec=deepcopy(sections[1]);body_sec=deepcopy(sections[-2]);plate_sec=deepcopy(sections[-1])
author_sec.find('w:cols',ns).set('{'+W+'}num','3')
plate_sec.find('w:type',ns).set('{'+W+'}val','continuous')
plate_sec.find('w:pgMar',ns).set('{'+W+'}left','45.35pt');plate_sec.find('w:pgMar',ns).set('{'+W+'}right','45.35pt')
for child in list(body):body.remove(child)

p=para('OpthaEdge for Diabetic Retinopathy Research Screening and Model Governance','papertitle')
section_end(p,title_sec);body.append(p)
authors=[('Shamail Pawar','shamail.pawar@vit.edu.in'),('Faizan Mustafa Shaikh','faizanmustaffa.shaikh@vit.edu.in'),('Ayaan Shaikh','ayaan.shaikh24@vit.edu.in')]
p=para('','Author');sub(props(p),'spacing',before='8pt',after='10pt',line='10.80pt',lineRule='exact')
sub(sub(props(p),'rPr'),'sz',val='18')
for i,(name,email) in enumerate(authors):
    if i:sub(sub(p,'r'),'br',type='column')
    lines=[name,'Department of Electronics &','Computer Science Engineering','Vidyalankar Institute of Technology','Mumbai, India',email]
    for j,line in enumerate(lines):
        if j:sub(sub(p,'r'),'br')
        r=sub(p,'r');rp=sub(r,'rPr');sub(rp,'sz',val='18')
        if j in [1,2,3]:sub(rp,'i')
        sub(r,'t').text=line
section_end(p,author_sec);body.append(p)

srcroot=E.fromstring(source['word/document.xml']);srcbody=srcroot.find('{'+OW+'}body')
srcrels=E.fromstring(source['word/_rels/document.xml.rels']);rels=E.fromstring(package['word/_rels/document.xml.rels'])
relmap={e.get('Id'):e for e in srcrels}
image_count=0; table_count=0; reference_count=0
for i,old in enumerate(srcbody):
    if i<5 or E.QName(old).localname=='sectPr':continue
    text=txt(old)
    if i==94:
        # End two-column manuscript before the full-width screenshot plate.
        section_end(body[-1],body_sec)
        p=para('Project Interface Figures','Heading5');sub(props(p),'pageBreakBefore');body.append(p)
        continue
    if E.QName(old).localname=='tbl':
        table_count+=1
        table=mapped(old)
        pr=table.find('w:tblPr',ns)
        for child in list(pr):pr.remove(child)
        sub(pr,'tblW',w='5033',type='dxa');sub(pr,'tblLayout',type='fixed')
        borders=sub(pr,'tblBorders')
        for edge in ['top','left','bottom','right','insideH','insideV']:sub(borders,edge,val='single',sz='4',color='000000')
        margins=sub(pr,'tblCellMar')
        for edge in ['top','bottom']:sub(margins,edge,w='40',type='dxa')
        for edge in ['left','right']:sub(margins,edge,w='55',type='dxa')
        grid=table.find('w:tblGrid',ns)
        widths=[int(c.get('{'+W+'}w')) for c in grid]
        widths=[round(v/sum(widths)*5033) for v in widths]
        for c,v in zip(grid,widths):c.set('{'+W+'}w',str(v))
        rows=table.findall('w:tr',ns)
        for rowidx,row in enumerate(rows):
            trpr=row.find('w:trPr',ns)
            if trpr is None:trpr=el('trPr');row.insert(0,trpr)
            sub(trpr,'cantSplit')
            if rowidx==0:sub(trpr,'tblHeader')
            for colidx,cell in enumerate(row.findall('w:tc',ns)):
                cp=cell.find('w:tcPr',ns)
                for c in list(cp):cp.remove(c)
                sub(cp,'tcW',w=widths[colidx],type='dxa');sub(cp,'vAlign',val='center')
                celltext=txt(cell).replace('retinal_binary_model.onnx','retinal_binary_\u200bmodel.onnx')
                for c in list(cell):
                    if c is not cp:cell.remove(c)
                p=para(celltext,'tablecolhead' if rowidx==0 else 'tablecopy')
                sub(props(p),'spacing',before='0pt',after='0pt');sub(props(p),'jc',val='start')
                if rowidx<len(rows)-1:sub(props(p),'keepNext')
                cell.append(p)
        body.append(table);continue
    drawings=old.xpath('.//*[local-name()="drawing"]')
    if drawings:
        image_count+=1;p=para('', 'Normal');sub(props(p),'jc',val='center');sub(props(p),'keepNext');sub(props(p),'spacing',before='3pt',after='0pt')
        drawing=mapped(drawings[0])
        for blip in drawing.xpath('.//*[local-name()="blip"]'):
            key='{'+R+'}embed';rid=blip.get(key);src=relmap[rid];target=src.get('Target');data=source['word/'+target]
            name=f'acdsa_figure_{image_count}.png';newrid=f'rId{100+image_count}'
            package['word/media/'+name]=data
            E.SubElement(rels,'{'+PR+'}Relationship',Id=newrid,Type=R+'/image',Target='media/'+name)
            blip.set(key,newrid)
        extent=drawing.xpath('.//*[local-name()="extent"]')[0]
        ratio=int(extent.get('cy'))/int(extent.get('cx'));cx=round((521.3 if image_count>3 else 251.65)*12700);cy=round(cx*ratio)
        extent.set('cx',str(cx));extent.set('cy',str(cy))
        for ext in drawing.xpath('.//*[local-name()="xfrm"]/*[local-name()="ext"]'):ext.set('cx',str(cx));ext.set('cy',str(cy))
        for dp in drawing.xpath('.//*[local-name()="docPr"]'):dp.set('id',str(image_count));dp.set('name',f'Figure {image_count}')
        sub(p,'r').append(drawing);body.append(p);continue
    if not text.strip():continue
    style='BodyText'
    oldstyle=old.find('{'+OW+'}pPr/{'+OW+'}pStyle')
    st=oldstyle.get('{'+OW+'}val') if oldstyle is not None else ''
    if text.startswith('Abstract.'):
        style='Abstract';text=text.replace('Abstract.','Abstract—',1)
    elif text.startswith('Keywords:'):style='Keywords';text=text.replace('Keywords:','Keywords—',1)
    elif st=='Heading1':
        if re.match(r'^[IVX]+  ',text):style='Heading1';text=re.sub(r'^[IVX]+  ','',text).title()
        else:style='Heading5';text=text.title()
    elif st=='Heading2':style='Heading2';text=re.sub(r'^[A-Z]  ','',text)
    elif text.startswith('TABLE '):style='tablehead';text=re.sub(r'^TABLE [IVX]+  ','',text).title()
    elif st=='Caption':style='figurecaption';text=re.sub(r'^Fig\. \d+\.\s*','',text)
    elif re.match(r'^\[\d+\]',text):style='references';text=re.sub(r'^\[\d+\]\s*','',text);reference_count+=1
    p=para(text,style)
    if style in ['Abstract','Keywords']:sub(props(p),'keepLines')
    if style=='tablehead':sub(props(p),'keepNext')
    if style=='Heading5':sub(props(p),'keepNext')
    if style=='figurecaption':sub(props(p),'keepLines')
    if style=='BodyText':
        # Preserve any source emphasis and mathematical superscript/subscript runs.
        for c in list(p):
            if E.QName(c).localname=='r':p.remove(c)
        for r in old.findall('{'+OW+'}r'):
            nr=mapped(r);rp=nr.find('w:rPr',ns)
            if rp is not None:
                for c in list(rp):
                    if E.QName(c).localname not in ['b','i','vertAlign']:rp.remove(c)
            for br in nr.findall('w:br',ns):nr.remove(br)
            p.append(nr)
    body.append(p)
body.append(plate_sec)
package['word/document.xml']=xml(root);package['word/_rels/document.xml.rels']=xml(rels)
foot=E.fromstring(package['word/footer1.xml'])
for c in list(foot):foot.remove(c)
foot.append(para('','Normal'));package['word/footer1.xml']=xml(foot)
ct=E.fromstring(package['[Content_Types].xml'])
if not any(e.get('Extension')=='png' for e in ct):E.SubElement(ct,'{'+E.QName(ct).namespace+'}Default',Extension='png',ContentType='image/png')
package['[Content_Types].xml']=xml(ct)
core=E.fromstring(package['docProps/core.xml'])
for e in core:
    if E.QName(e).localname=='title':e.text='OpthaEdge for Diabetic Retinopathy Research Screening and Model Governance'
    elif E.QName(e).localname=='creator':e.text='Shamail Pawar; Faizan Mustafa Shaikh; Ayaan Shaikh'
    elif E.QName(e).localname=='lastModifiedBy':e.text=''
package['docProps/core.xml']=xml(core)
with ZipFile(OUT,'w',ZIP_DEFLATED) as z:
    for n,data in package.items():z.writestr(n,data)
with ZipFile(TEMPLATE) as z:
    unchanged=[n for n in z.namelist() if z.read(n)==package[n]]
report={'output':str(OUT),'figures':image_count,'tables':table_count,'references':reference_count,'unchanged_template_parts':unchanged,'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'template_sha256':hashlib.sha256(TEMPLATE.read_bytes()).hexdigest()}
(HERE/'format_checks.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
